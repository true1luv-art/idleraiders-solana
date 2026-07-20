/**
 * server/solana-smart-contract/workers/drain.withdrawal.ts
 *
 * Withdrawal drain handler.
 *
 * Flow:
 *   1. Atomic balance deduction (guards at-most-once debit).
 *   2. Send tokens on-chain via getChain().sendWithdrawal().
 *   3. Record ledger row (insertProcessedTransaction — idempotent).
 *   4. completeJob.
 *   (Client detects settlement via HTTP polling of /api/transactions — no socket notify needed.)
 *
 * Critical idempotency rule:
 *   If step 2 succeeds but step 3/4 fail, the worker must NOT refund —
 *   tokens are already on-chain. The `chainTxId` approach from boom-miner
 *   is not needed here because withdrawCoins() in boom-miner owns both
 *   the send and the debit atomically. Here we follow the same pattern:
 *   deduct first then send, and rely on the unique ledger txHash index to
 *   prevent double-recording on retry.
 *
 * SERVER-ONLY.
 */

import { completeJob, failJob } from '@/lib/modules/transactions-pending/repository.server'
import type { IPendingTransaction } from '@/lib/modules/transactions-pending/types.server'
import { insertProcessedTransaction } from '@/lib/modules/transactions-processed/repository.server'
import { getChain } from '../chain'
import Player from '@/lib/modules/players/model.server'
import { connectDB } from '@/lib/config/database'
import { logger } from '../lib/logger'

/** Terminal withdrawal business errors — retrying will never help. */
const NON_RETRYABLE = new Set(['INSUFFICIENT_COINS', 'NOT_FOUND', 'INVALID_AMOUNT'])

export async function drainWithdrawal(
  job: IPendingTransaction,
  maxRetries: number,
): Promise<void> {
  const id     = String(job._id)
  const amount = job.withdrawAmount ?? 0

  await connectDB()

  // 1. Atomic balance deduction — guards at-most-once debit.
  const player = await Player.findOneAndUpdate(
    {
      $or: [
        { walletAddress: job.walletAddress },
        { username: job.walletAddress },
      ],
      coins: { $gte: amount },
    },
    { $inc: { coins: -amount } },
    { new: true },
  ).lean()

  if (!player) {
    // Either player not found or insufficient balance — terminal.
    await failJob(id, 'INSUFFICIENT_COINS: balance too low or player not found', 1)
    logger.warn('withdrawal: insufficient balance — dead-lettered', {
      wallet: job.walletAddress,
      amount,
    })
    return
  }

  // 2. Send tokens on-chain.
  let txHash: string
  try {
    const result = await getChain().sendWithdrawal(job.walletAddress, amount, job.signature)
    txHash = result.txHash
  } catch (err: unknown) {
    const code    = (err as { code?: string })?.code ?? 'ERROR'
    const message = err instanceof Error ? err.message : String(err)

    // Restore coins — the on-chain send failed so nothing left the treasury.
    await Player.updateOne(
      {
        $or: [
          { walletAddress: job.walletAddress },
          { username: job.walletAddress },
        ],
      },
      { $inc: { coins: amount } },
    )

    if (NON_RETRYABLE.has(code)) {
      await failJob(id, `${code}: ${message}`, 1)
      logger.warn('withdrawal: non-retryable error — dead-lettered', { wallet: job.walletAddress, code })
      return
    }

    const deadLettered = await failJob(id, `${code}: ${message}`, maxRetries)
    logger.warn(
      deadLettered ? 'withdrawal: dead-lettered (max retries)' : 'withdrawal: retry scheduled',
      { wallet: job.walletAddress, code },
    )
    return
  }

  // 3. Record ledger row — idempotent on txHash.
  await insertProcessedTransaction({
    txHash,
    wallet: job.walletAddress,
    type:   'withdrawal',
    amount: -amount,
  })

  // 4. Complete queue row.
  await completeJob(id)

  // Client detects settlement via HTTP polling of /api/transactions — no socket notify needed.

  logger.info('withdrawal settled', { wallet: job.walletAddress, amount, txHash })
}
