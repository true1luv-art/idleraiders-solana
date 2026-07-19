/**
 * lib/chain/hive/transfer.ts
 *
 * Treasury → player Hive-Engine token payout (withdrawal).
 *
 * A Hive-Engine token transfer is a `custom_json` operation broadcast on the
 * Hive consensus layer with the treasury's ACTIVE key. dhive returns the Hive
 * transaction id once the op is accepted; the sidechain then applies it.
 *
 * Pure chain operation: does NOT touch MongoDB. Callers own DB mutations and
 * idempotency. Throws on any failure so the caller can leave state untouched.
 *
 * SERVER-ONLY.
 */

import type { CustomJsonOperation } from "@hiveio/dhive";
import {
  getHiveClient,
  getTreasuryAccount,
  getTreasuryActiveKey,
  getTokenSymbol,
  getEngineBalance,
  ENGINE_ID,
  TOKEN_PRECISION,
} from "./rpc";
import { buildWithdrawMemo } from "./memo";

export interface HiveTransferResult {
  /** Hive consensus-layer transaction id carrying the custom_json op. */
  txId: string;
}

/** Formats an amount to the token's fixed precision (Hive-Engine requires a string). */
function formatQuantity(amount: number, precision: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid transfer amount: ${amount}`);
  }
  return amount.toFixed(precision);
}

/**
 * Core payout routine shared by withdrawals and refunds.
 *
 * Steps:
 *   1. Preflight the treasury token balance via the Hive-Engine contracts API.
 *   2. Build the `tokens.transfer` custom_json payload.
 *   3. Broadcast with the treasury active key; return the Hive tx id.
 */
export async function sendTokens(
  recipientAccount: string,
  amount: number,
  memo: string,
): Promise<HiveTransferResult> {
  const client = getHiveClient();
  const treasury = getTreasuryAccount();
  const symbol = getTokenSymbol();
  const to = recipientAccount.trim().toLowerCase();
  const quantity = formatQuantity(amount, TOKEN_PRECISION);

  // Preflight balance check.
  const balance = await getEngineBalance(treasury, symbol);
  if (balance < amount) {
    throw Object.assign(
      new Error(`Treasury token balance insufficient: has ${balance} ${symbol}, needs ${amount}`),
      { code: "TREASURY_INSUFFICIENT" },
    );
  }

  const json = JSON.stringify({
    contractName: "tokens",
    contractAction: "transfer",
    contractPayload: { symbol, to, quantity, memo },
  });

  const op: CustomJsonOperation = [
    "custom_json",
    {
      required_auths: [treasury],
      required_posting_auths: [],
      id: ENGINE_ID,
      json,
    },
  ];

  const result = await client.broadcast.sendOperations([op], getTreasuryActiveKey());

  return { txId: result.id };
}

/**
 * Sends `amount` whole tokens from the treasury to `playerAccount` as a
 * withdrawal, tagged with a withdrawal-reference memo.
 */
export async function sendWithdrawal(
  playerAccount: string,
  amount: number,
  ref: string,
): Promise<HiveTransferResult> {
  return sendTokens(playerAccount, amount, buildWithdrawMemo(ref));
}
