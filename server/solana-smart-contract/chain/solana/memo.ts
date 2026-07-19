/**
 * server/solana-smart-contract/chain/solana/memo.ts
 *
 * SPL Memo program helpers. Attaching a memo instruction to a payout
 * transaction records a human-readable reference directly on-chain.
 *
 * SERVER-ONLY.
 */

import { PublicKey, TransactionInstruction } from '@solana/web3.js'

/** Canonical SPL Memo program id (same on mainnet, devnet, testnet). */
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

export function buildDepositMemo(ref: string): string {
  return `idleraiders:deposit:${ref}`
}

export function buildWithdrawMemo(ref: string): string {
  return `idleraiders:withdraw:${ref}`
}

export function buildPurchaseMemo(ref: string): string {
  return `idleraiders:purchase:${ref}`
}

/**
 * Builds a Memo-program instruction carrying `memo`.
 * The treasury signs the enclosing transaction, so no extra signer keys needed.
 */
export function buildMemoInstruction(memo: string): TransactionInstruction {
  return new TransactionInstruction({
    keys:      [],
    programId: MEMO_PROGRAM_ID,
    data:      Buffer.from(memo, 'utf8'),
  })
}
