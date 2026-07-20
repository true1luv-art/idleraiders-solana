/**
 * server/solana-smart-contract/workers/drain.worker.ts
 *
 * Main polling loop for the new durable transaction queue.
 *
 * Polls `transactions_pending` every 5 s (configurable via config.withdrawal.workerPollMs),
 * processes jobs oldest-first (sequential — no concurrent double-spends),
 * routes to the correct handler by type.
 *
 * Processes all pending transactions from the transactions_pending collection.
 * Routes deposit / withdrawal / purchase jobs to their dedicated handlers.
 *
 * SERVER-ONLY.
 */

import {
  listPendingOldestFirst,
  countJobsByStatus,
} from '@/lib/modules/transactions-pending/repository.server'
import type { IPendingTransaction } from '@/lib/modules/transactions-pending/types.server'
import { config } from '@/lib/config/config'
import { logger } from '../lib/logger'
import { drainDeposit } from './drain.deposit'
import { drainWithdrawal } from './drain.withdrawal'
import { drainPurchase } from './drain.purchase'

let pollInterval: ReturnType<typeof setInterval> | null = null
let draining = false
let stopped  = false

const POLL_MS    = config.withdrawal.workerPollMs
const MAX_RETRIES = config.withdrawal.maxRetries

// ─────────────────────────────────────────────────────────────────────────────
// Drain cycle
// ─────────────────────────────────────────────────────────────────────────────

async function tick(): Promise<void> {
  if (draining || stopped) return
  draining = true
  try {
    const jobs = await listPendingOldestFirst(10)
    if (jobs.length === 0) return

    logger.info(`draining ${jobs.length} job(s)`)

    for (const job of jobs) {
      if (stopped) break
      await processJob(job)
    }
  } catch (err) {
    logger.error('drain cycle error', { error: err instanceof Error ? err.message : String(err) })
  } finally {
    draining = false
  }
}

async function processJob(job: IPendingTransaction): Promise<void> {
  try {
    switch (job.type) {
      case 'deposit':
        await drainDeposit(job, MAX_RETRIES)
        break
      case 'withdrawal':
        await drainWithdrawal(job, MAX_RETRIES)
        break
      case 'purchase':
        await drainPurchase(job, MAX_RETRIES)
        break
      default:
        logger.warn('unknown job type', { type: (job as IPendingTransaction).type, id: String(job._id) })
    }
  } catch (err) {
    logger.error('unhandled job error', {
      id:    String(job._id),
      type:  job.type,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue depth — boot log
// ─────────────────────────────────────────────────────────────────────────────

async function logQueueDepth(): Promise<void> {
  const counts = await countJobsByStatus()
  logger.info('drain worker queue depth at start', counts)
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

export function initializeDrainWorker(): void {
  if (pollInterval) return
  stopped = false

  void logQueueDepth()
  void tick()                                           // immediate first drain
  pollInterval = setInterval(() => void tick(), POLL_MS)

  console.log(
    `[idleraiders-logs] Drain worker initialized (chain=${config.blockchain.chain}, polling every ${POLL_MS / 1000}s)`,
  )
}

export async function closeDrainWorker(): Promise<void> {
  stopped = true
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  workerIo = null
  console.log('[idleraiders-logs] Drain worker closed')
}

export default { initializeDrainWorker, closeDrainWorker }
