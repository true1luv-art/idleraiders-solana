/**
 * server/solana-smart-contract/index.ts
 *
 * Entry point for the standalone drain worker process.
 *
 * This module is integrated into the Next.js custom server via
 * server/workers/index.ts (initializeDrainWorker). This standalone entry
 * point exists for running the worker as a separate process in production.
 *
 * Environment variables required:
 *   MONGO_URI           — MongoDB connection string
 *   NEXT_PUBLIC_CHAIN   — active chain (solana | hive | robinhood, default: solana)
 *   CONTRACT_ADDRESS    — SPL mint or ERC-20 contract address
 *   TREASURY_ADDRESS    — treasury wallet public key / Hive account
 *   TREASURY_KEY        — treasury keypair (base58/JSON for Solana, WIF for Hive, hex for Robinhood)
 *
 * OPERATIONAL CONSTRAINT: run exactly ONE instance to preserve the sequential,
 * oldest-first settlement guarantee (no concurrent double-spends).
 */

import { connectDB } from '@/lib/config/database'
import { countJobsByStatus } from '@/lib/modules/transactions-pending/repository.server'
import { logger } from './lib/logger'
import { config } from '@/lib/config/config'

async function main(): Promise<void> {
  await connectDB()
  logger.info('MongoDB connected', { chain: config.blockchain.chain })

  const counts = await countJobsByStatus()
  logger.info('queue depth at startup', counts)

  // Inline worker class when running standalone (no Socket.IO available).
  // For the integrated Next.js server, use initializeDrainWorker() from drain.worker.ts.
  const { listPendingOldestFirst, completeJob, failJob } = await import(
    '@/lib/modules/transactions-pending/repository.server'
  )
  const { drainDeposit }    = await import('./workers/drain.deposit')
  const { drainWithdrawal } = await import('./workers/drain.withdrawal')
  const { drainPurchase }   = await import('./workers/drain.purchase')

  // Minimal no-op Socket.IO stub for the standalone process.
  const stubIo = { to: () => ({ emit: () => {} }) } as never

  let stopped = false
  const POLL_MS     = config.withdrawal.workerPollMs
  const MAX_RETRIES = config.withdrawal.maxRetries

  const drain = async () => {
    if (stopped) return
    try {
      const jobs = await listPendingOldestFirst(10)
      for (const job of jobs) {
        if (stopped) break
        try {
          if (job.type === 'deposit')    await drainDeposit(job, stubIo, MAX_RETRIES)
          if (job.type === 'withdrawal') await drainWithdrawal(job, stubIo, MAX_RETRIES)
          if (job.type === 'purchase')   await drainPurchase(job, stubIo, MAX_RETRIES)
        } catch (err) {
          logger.error('job error', { id: String(job._id), error: err instanceof Error ? err.message : String(err) })
        }
      }
    } catch (err) {
      logger.error('drain cycle error', { error: err instanceof Error ? err.message : String(err) })
    }
  }

  logger.info(`drain worker started (poll every ${POLL_MS}ms)`)
  void drain()
  const timer = setInterval(() => void drain(), POLL_MS)

  const shutdown = (signal: string) => {
    logger.info(`${signal} received — stopping`)
    stopped = true
    clearInterval(timer)
    setTimeout(() => process.exit(0), 500)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}

main().catch((err) => {
  console.error('[idleraiders-logs] FATAL startup error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
