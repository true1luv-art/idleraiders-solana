/**
 * server/solana-smart-contract/lib/transfers.ts
 *
 * On-chain payout adapter for the withdrawal worker.
 *
 * Rather than re-implement the SPL transfer (ATA resolution, treasury preflight,
 * transferChecked + memo, send/confirm), this delegates to the canonical
 * implementation in `lib/chain/solana/transfer.ts` — the single source of truth
 * for treasury -> player payouts. Keeping one implementation avoids drift
 * between the request-time chain layer and the worker.
 *
 * SERVER-ONLY.
 */

import { sendWithdrawal, type SolanaTransferResult } from "@/lib/chain/solana/transfer";

/**
 * Sends `amount` whole tokens from the treasury to `playerWallet`.
 * `ref` (the queue signature) is embedded in the on-chain memo for auditing.
 *
 * Throws on failure with a `.code` of "TREASURY_INSUFFICIENT" or "TX_REVERTED"
 * (surfaced by the underlying chain layer) so the caller can map it cleanly.
 */
export async function sendWithdrawalToPlayer(
  playerWallet: string,
  amount: number,
  ref: string,
): Promise<SolanaTransferResult> {
  return sendWithdrawal(playerWallet, amount, ref);
}
