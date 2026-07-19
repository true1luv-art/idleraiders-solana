/**
 * lib/modules/transactions-pending/repository.server.ts
 *
 * Data-access surface for the durable queue.
 * Imported by both Next.js API routes (enqueue) and the solana-smart-contract
 * drain worker (drain / complete / fail).
 *
 * SERVER-ONLY.
 */

import { randomUUID } from 'crypto'
import { PendingTransactionModel } from './model.server'
import type { IPendingTransaction, PendingTxStatus } from './types.server'
import { connectDB } from '@/lib/config/database'

export type { IPendingTransaction } from './types.server'

const DEFAULT_MAX_RETRIES = 8

// ─────────────────────────────────────────────────────────────────────────────
// Enqueue
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enqueues a deposit. `signature` is the on-chain transfer txId.
 * Returns `duplicate: true` when the same txId was already enqueued/processed.
 */
export async function enqueueDeposit(input: {
  walletAddress: string
  txId: string
  amount: number
}): Promise<{ jobId: string; signature: string; duplicate: boolean }> {
  await connectDB()
  try {
    const doc = await PendingTransactionModel.create({
      type:          'deposit',
      signature:     input.txId,
      walletAddress: input.walletAddress,
      amount:        input.amount,
      status:        'pending',
      retryCount:    0,
    })
    return { jobId: String(doc._id), signature: input.txId, duplicate: false }
  } catch (err: unknown) {
    if (isDuplicateKey(err)) {
      const existing = await PendingTransactionModel.findOne({ signature: input.txId })
        .select('_id')
        .lean<{ _id: unknown }>()
      return {
        jobId:     existing ? String(existing._id) : input.txId,
        signature: input.txId,
        duplicate: true,
      }
    }
    throw err
  }
}

/**
 * Enqueues a withdrawal. Generates a UUID as the idempotency key.
 */
export async function enqueueWithdrawal(input: {
  walletAddress: string
  withdrawAmount: number
}): Promise<{ jobId: string; signature: string }> {
  await connectDB()
  const signature = randomUUID()
  const doc = await PendingTransactionModel.create({
    type:           'withdrawal',
    signature,
    walletAddress:  input.walletAddress,
    withdrawAmount: input.withdrawAmount,
    status:         'pending',
    retryCount:     0,
  })
  return { jobId: String(doc._id), signature }
}

/**
 * Enqueues a purchase. `signature` is the on-chain transfer txId.
 * Returns `duplicate: true` when the same txId was already enqueued/processed.
 */
export async function enqueuePurchase(input: {
  walletAddress: string
  txId: string
  amount: number
  itemId: string
}): Promise<{ jobId: string; signature: string; duplicate: boolean }> {
  await connectDB()
  try {
    const doc = await PendingTransactionModel.create({
      type:          'purchase',
      signature:     input.txId,
      walletAddress: input.walletAddress,
      amount:        input.amount,
      itemId:        input.itemId,
      status:        'pending',
      retryCount:    0,
    })
    return { jobId: String(doc._id), signature: input.txId, duplicate: false }
  } catch (err: unknown) {
    if (isDuplicateKey(err)) {
      const existing = await PendingTransactionModel.findOne({ signature: input.txId })
        .select('_id')
        .lean<{ _id: unknown }>()
      return {
        jobId:     existing ? String(existing._id) : input.txId,
        signature: input.txId,
        duplicate: true,
      }
    }
    throw err
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Drain helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns pending or previously failed jobs, oldest-first.
 * `limit = 0` means no limit.
 */
export async function listPendingOldestFirst(limit = 0): Promise<IPendingTransaction[]> {
  await connectDB()
  const query = PendingTransactionModel.find({
    status: { $in: ['pending', 'failed'] satisfies PendingTxStatus[] },
  }).sort({ createdAt: 1 })
  if (limit > 0) query.limit(limit)
  return query.exec()
}

/** Deletes a job on terminal success. */
export async function completeJob(id: string): Promise<void> {
  await connectDB()
  await PendingTransactionModel.deleteOne({ _id: id })
}

/**
 * Records a failure: increments retryCount, stores the error message, and
 * dead-letters the row once `maxRetries` is exceeded.
 * Returns `true` when the job was dead-lettered.
 */
export async function failJob(
  id: string,
  message: string,
  maxRetries = DEFAULT_MAX_RETRIES,
): Promise<boolean> {
  await connectDB()
  const doc = await PendingTransactionModel.findById(id)
  if (!doc) return false

  doc.retryCount += 1
  doc.lastError   = message.slice(0, 500)
  const deadLettered = doc.retryCount >= maxRetries
  doc.status = deadLettered ? 'dead' : 'failed'
  await doc.save()
  return deadLettered
}

/** Aggregates job counts grouped by status — for boot/heartbeat logging. */
export async function countJobsByStatus(): Promise<Record<string, number>> {
  await connectDB()
  const rows = await PendingTransactionModel.aggregate<{ _id: string; n: number }>([
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ])
  return rows.reduce<Record<string, number>>((acc, r) => {
    acc[r._id] = r.n
    return acc
  }, {})
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
