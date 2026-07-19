/**
 * server/solana-smart-contract/workers/drain.deposit.ts
 *
 * Deposit drain handler.
 *
 * Flow:
 *   1. Verify the on-chain transfer (player → treasury).
 *   2. Claim the settlement slot (at-most-once credit via txHash index).
 *   3. $inc player coins.
 *   4. completeJob.
 *   5. Socket notify.
 *
 * SERVER-ONLY.
 */

import type { Server } from 'socket.io'
import { completeJob, failJob } from '@/lib/modules/transactions-pending/repository.server'
import type { IPendingTransaction } from '@/lib/modules/transactions-pending/types.server'
import { claimProcessedTransaction } from '@/lib/modules/transactions-processed/repository.server'
import { getChain } from '../chain'
import Player from '@/lib/modules/players/player.model'
import { connectDB } from '@/lib/config/database'
import { logger } from '../lib/logger'

/** Max verify tries per drain attempt — low so slow confirms retry via queue. */
const VERIFY_MAX_TRIES = 2

export async function drainDeposit(
  job: IPendingTransaction,
  io: Server,
  maxRetries: number,
): Promise<void> {
  const id     = String(job._id)
  const amount = job.amount ?? 0

  // 1. Verify on-chain transfer.
  let verification
  try {
    verification = await getChain().verifyDeposit(job.signature, job.walletAddress, amount)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await failJob(id, `VERIFY_ERROR: ${message}`, maxRetries)
    logger.warn('deposit verify threw', { wallet: job.walletAddress, error: message })
    return
  }

  if (!verification.valid) {
    if (verification.code === 'NOT_CONFIRMED') {
      await failJob(id, `NOT_CONFIRMED: ${verification.reason ?? ''}`, maxRetries)
      logger.warn('deposit not confirmed yet', { wallet: job.walletAddress, sig: job.signature })
      return
    }
    // INVALID — terminal, dead-letter immediately.
    await failJob(id, `INVALID: ${verification.reason ?? ''}`, 1)
    logger.warn('deposit invalid — dead-lettered', { wallet: job.walletAddress, reason: verification.reason })
    return
  }

  // 2. Claim settlement slot (at-most-once credit).
  const { claimed } = await claimProcessedTransaction({
    txHash: job.signature,
    wallet: job.walletAddress,
    type:   'deposit',
    amount,
  })

  if (!claimed) {
    // Already credited in a previous run — idempotent success.
    await completeJob(id)
    logger.info('deposit already processed — idempotent complete', { wallet: job.walletAddress })
    return
  }

  // 3. Credit coins atomically.
  await connectDB()
  const player = await Player.findOneAndUpdate(
    {
      $or: [
        { walletAddress: job.walletAddress },
        { username: job.walletAddress }, // legacy Hive username fallback
      ],
    },
    { $inc: { coins: amount } },
    { new: true },
  ).lean()

  if (!player) {
    logger.warn('deposit: player not found', { wallet: job.walletAddress })
  }

  // 4. Complete queue row.
  await completeJob(id)

  // 5. Notify client via socket.
  if (player) {
    const { userSockets } = await import('@/server/sockets/socket.manager')
    const socketId = userSockets.get((player as { username?: string }).username ?? '')
    if (socketId) {
      io.to(socketId).emit('updated_user_state', { coins: (player as { coins?: number }).coins })
    }
  }

  logger.info('deposit settled', { wallet: job.walletAddress, amount, txHash: job.signature })
}
