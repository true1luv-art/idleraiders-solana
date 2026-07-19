/**
 * server/solana-smart-contract/chain/robinhood/transfer.ts
 *
 * Treasury → player ERC-20 payout (withdrawal) on Robinhood Chain.
 *
 * Pure chain operation: does NOT touch MongoDB.
 *
 * SERVER-ONLY.
 */

import { parseUnits, formatUnits } from 'ethers'
import { getTreasuryWallet, getTokenContract, TOKEN_DECIMALS } from './rpc'
import { buildWithdrawMemo, encodeMemoHex } from './memo'

export interface RobinhoodTransferResult {
  txHash: string
  memoTxHash?: string
}

export async function sendTokens(
  recipientWallet: string,
  amount: number,
  memo: string,
): Promise<RobinhoodTransferResult> {
  const token     = getTokenContract()
  const treasury  = getTreasuryWallet()
  const rawAmount = parseUnits(String(amount), TOKEN_DECIMALS)

  const treasuryBalance: bigint = await token.balanceOf(treasury.address)
  if (treasuryBalance < rawAmount) {
    throw Object.assign(
      new Error(`Treasury balance insufficient: has ${formatUnits(treasuryBalance, TOKEN_DECIMALS)}, needs ${amount}`),
      { code: 'TREASURY_INSUFFICIENT' },
    )
  }

  const tx      = await token.transfer(recipientWallet, rawAmount)
  const receipt = await tx.wait(1)
  if (!receipt || receipt.status !== 1) {
    throw Object.assign(new Error(`Transfer reverted: ${tx.hash}`), { code: 'TX_REVERTED', txHash: tx.hash })
  }

  const result: RobinhoodTransferResult = { txHash: receipt.hash }

  // Optional on-chain memo tx — best-effort, never undoes a completed payout.
  try {
    const memoTx      = await treasury.sendTransaction({ to: recipientWallet, value: 0n, data: encodeMemoHex(memo) })
    const memoReceipt = await memoTx.wait(1)
    if (memoReceipt?.hash) result.memoTxHash = memoReceipt.hash
  } catch {
    // Non-critical
  }

  return result
}

export async function sendWithdrawal(
  playerWallet: string,
  amount: number,
  ref: string,
): Promise<{ txHash: string }> {
  const res = await sendTokens(playerWallet, amount, buildWithdrawMemo(ref))
  return { txHash: res.txHash }
}
