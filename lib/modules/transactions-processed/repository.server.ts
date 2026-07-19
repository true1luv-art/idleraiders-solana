/**
 * lib/modules/transactions-processed/repository.server.ts
 *
 * Data-access surface for the permanent settlement ledger.
 *
 * SERVER-ONLY.
 */

import { ProcessedTransactionModel } from './model.server'
import type { IProcessedTransaction, ProcessedTxType } from './types.server'
import { connectDB } from '@/lib/config/database'

export type { IProcessedTransaction } from './types.server'

// ─────────────────────────────────────────────────────────────────────────────
// Writes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inserts a ledger row. A duplicate `txHash` (E11000) is swallowed and treated
 * as "already recorded" — idempotent no-op. Used by withdrawal drain where
 * tokens are already on-chain regardless of whether we recorded the row.
 */
export async function insertProcessedTransaction(input: {
  txHash: string
  wallet: string
  type: ProcessedTxType
  amount: number
}): Promise<void> {
  await connectDB()
  try {
    await ProcessedTransactionModel.create({
      txHash:      input.txHash,
      wallet:      input.wallet,
      type:        input.type,
      amount:      input.amount,
      processedAt: Date.now(),
    })
  } catch (err: unknown) {
    if (isDuplicateKey(err)) return
    throw err
  }
}

/**
 * Atomically claims a settlement by inserting its ledger row.
 *
 * Because `txHash` is uniquely indexed, exactly one concurrent caller ever
 * gets `claimed: true` for a given signature — safe at-most-once gate for
 * deposit and purchase credits.
 */
export async function claimProcessedTransaction(input: {
  txHash: string
  wallet: string
  type: ProcessedTxType
  amount: number
}): Promise<{ claimed: boolean }> {
  await connectDB()
  try {
    await ProcessedTransactionModel.create({
      txHash:      input.txHash,
      wallet:      input.wallet,
      type:        input.type,
      amount:      input.amount,
      processedAt: Date.now(),
    })
    return { claimed: true }
  } catch (err: unknown) {
    if (isDuplicateKey(err)) return { claimed: false }
    throw err
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────────

export async function isTransactionProcessed(txHash: string): Promise<boolean> {
  await connectDB()
  const count = await ProcessedTransactionModel.countDocuments({ txHash }).limit(1)
  return count > 0
}

/**
 * Keyset-paginated history for a wallet, newest-first.
 * Pass the returned `nextCursor` as `cursor` on the next request.
 */
export async function getTransactionHistory(
  wallet: string,
  limit: number,
  cursor?: number,
  type?: ProcessedTxType,
): Promise<{ transactions: IProcessedTransaction[]; nextCursor: number | null }> {
  await connectDB()

  const filter: Record<string, unknown> = { wallet }
  if (type) filter.type = type
  if (cursor != null) filter.processedAt = { $lt: cursor }

  // Fetch one extra to determine whether another page exists.
  const rows = await ProcessedTransactionModel.find(filter)
    .sort({ processedAt: -1 })
    .limit(limit + 1)
    .lean<IProcessedTransaction[]>()

  const hasMore = rows.length > limit
  const transactions = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? transactions[transactions.length - 1].processedAt : null

  return { transactions, nextCursor }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  )
}
