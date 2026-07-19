/**
 * lib/chain/transfers.ts
 *
 * High-level on-chain helpers for the HFARM bank bridge.
 *
 * - sendWithdrawalToPlayer  — treasury EOA sends tokens to the player wallet.
 * - verifyDepositFromPlayer — confirms a player-signed transfer landed on-chain.
 *
 * Both functions are pure chain operations and do NOT touch MongoDB.
 * The callers (bank.server.ts, deposit/verify route) handle DB mutations.
 *
 * SERVER-ONLY.
 */

import { parseUnits, formatUnits, decodeEventLog } from "viem";
import { config }       from "@/lib/config/config";
import { publicClient } from "./client";
import {
  hfarmWriteContract,
  hfarmReadContract,
  HFARM_DECIMALS,
  HFARM_ABI,
} from "./hfarm";

// ---------------------------------------------------------------------------
// Withdrawal — treasury → player
// ---------------------------------------------------------------------------

export interface WithdrawalTxResult {
  txHash: string;
}

/**
 * Sends `amount` whole $HFARM from the treasury wallet to `playerWallet`.
 *
 * Steps:
 *   1. Preflight — check on-chain treasury balance to avoid an on-chain revert.
 *   2. Broadcast the ERC-20 transfer via the treasury wallet client.
 *   3. Wait for 1-confirmation receipt and assert status === "success".
 *
 * Throws on any failure. The caller must NOT mutate MongoDB before this resolves.
 */
export async function sendWithdrawalToPlayer(
  playerWallet: string,
  amount: number,
): Promise<WithdrawalTxResult> {
  const rawAmount = parseUnits(String(amount), Number(HFARM_DECIMALS));

  // Preflight balance check
  const readContract       = hfarmReadContract();
  const treasuryBalance    = await readContract.read.balanceOf([
    config.hfarmTreasuryAddress as `0x${string}`,
  ]) as bigint;

  if (treasuryBalance < rawAmount) {
    throw Object.assign(
      new Error(
        `Treasury balance insufficient: has ${formatUnits(treasuryBalance, Number(HFARM_DECIMALS))} HFARM, needs ${amount}`,
      ),
      { code: "TREASURY_INSUFFICIENT" },
    );
  }

  // Broadcast
  const writeContract = hfarmWriteContract();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txHash = await (writeContract.write.transfer as any)([
    playerWallet as `0x${string}`,
    rawAmount,
  ]);

  // Wait for receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status !== "success") {
    throw Object.assign(
      new Error(`Withdrawal transaction reverted: ${txHash}`),
      { code: "TX_REVERTED", txHash },
    );
  }

  return { txHash };
}

// ---------------------------------------------------------------------------
// Deposit verification — confirm player's transfer landed on-chain
// ---------------------------------------------------------------------------

export interface DepositVerification {
  valid: boolean;
  reason?: string;
}

/**
 * Verifies that `txHash` is a confirmed ERC-20 Transfer on the HFARM contract:
 *   from  === expectedPlayerWallet  (case-insensitive)
 *   to    === HFARM_TREASURY_ADDRESS
 *   value === expectedAmount (whole HFARM, exact match)
 *
 * Returns { valid: true } on success or { valid: false, reason } on failure.
 * Does NOT touch MongoDB — idempotency + coin crediting is the caller's job.
 */
export async function verifyDepositFromPlayer(
  txHash: string,
  expectedPlayerWallet: string,
  expectedAmount: number,
): Promise<DepositVerification> {
  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (!receipt || receipt.status !== "success") {
      return { valid: false, reason: "Transaction not confirmed or reverted" };
    }

    const expectedValue = parseUnits(String(expectedAmount), Number(HFARM_DECIMALS));
    const tokenAddr     = config.hfarmTokenAddress.toLowerCase();
    const treasuryAddr  = config.hfarmTreasuryAddress.toLowerCase();
    const playerAddr    = expectedPlayerWallet.toLowerCase();

    // Walk the receipt logs looking for a matching Transfer event emitted by
    // the HFARM contract in this exact transaction.
    for (const log of receipt.logs) {
      // Filter by contract address
      if (log.address.toLowerCase() !== tokenAddr) continue;

      let decoded: { eventName: string; args: { from?: string; to?: string; value?: bigint } };
      try {
        decoded = decodeEventLog({
          abi:    HFARM_ABI,
          data:   log.data,
          topics: log.topics,
        }) as typeof decoded;
      } catch {
        continue; // not a Transfer event — skip
      }

      if (decoded.eventName !== "Transfer") continue;

      const { from, to, value } = decoded.args;
      if (
        from?.toLowerCase()  === playerAddr   &&
        to?.toLowerCase()    === treasuryAddr &&
        value                === expectedValue
      ) {
        return { valid: true };
      }
    }

    return {
      valid:  false,
      reason: "No matching Transfer event found in this transaction for the given sender, recipient, and amount",
    };
  } catch (err) {
    return {
      valid:  false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
