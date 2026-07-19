/**
 * server/solana-smart-contract/lib/transfers.ts
 *
 * On-chain payout adapter for the drain worker.
 *
 * Delegates to getChain() so the correct chain adapter (solana / hive /
 * robinhood) is used based on NEXT_PUBLIC_CHAIN. This keeps the worker
 * code free of any direct chain imports.
 *
 * SERVER-ONLY.
 */

import { getChain } from '../chain'

/**
 * Sends `amount` whole tokens from the treasury to `playerWallet`.
 * `ref` (the queue signature) is embedded in the on-chain memo for auditing.
 *
 * Throws on failure with a `.code` of "TREASURY_INSUFFICIENT" or "TX_REVERTED".
 */
export async function sendWithdrawalToPlayer(
  playerWallet: string,
  amount: number,
  ref: string,
): Promise<{ txHash: string }> {
  return getChain().sendWithdrawal(playerWallet, amount, ref)
}
