/**
 * Workers Index
 * Initialize all background workers
 */

import { initializeTransactionWorker, closeTransactionWorker } from './transaction.worker'
import { initializePriceWorker, stopPriceWorker } from './worker.price'
import { initializeSnapshotWorker, stopSnapshotWorker } from './worker.snapshot'
import { initializeGuildWarWorker, stopGuildWarWorker } from './worker.guildwar'
import { initializeDrainWorker, closeDrainWorker } from '../solana-smart-contract/workers/drain.worker'
import { getIO } from '../sockets/socket.manager'

/**
 * Start all workers
 */
export async function startWorkers(): Promise<void> {
  console.log('[idleraiders-logs] Starting workers...')

  const io = getIO()
  if (io) {
    // Legacy Hive transaction worker — kept running during migration window.
    initializeTransactionWorker(io)

    // New durable transaction queue worker (deposit / withdrawal / purchase).
    // Reads from transactions_pending; safe to run alongside the legacy worker.
    initializeDrainWorker(io)
  } else {
    console.warn('[idleraiders-logs] Socket.IO not initialized, transaction workers skipped')
  }

  // Initialize price worker (cron-based)
  initializePriceWorker()

  // Initialize snapshot worker (cron-based)
  initializeSnapshotWorker()

  // Initialize guild war worker (cron-based)
  initializeGuildWarWorker()

  console.log('[idleraiders-logs] All workers initialized')
}

/**
 * Stop all workers gracefully
 */
export async function stopWorkers(): Promise<void> {
  console.log('[idleraiders-logs] Stopping workers...')

  await closeTransactionWorker()
  await closeDrainWorker()
  stopPriceWorker()
  await stopSnapshotWorker()
  stopGuildWarWorker()

  console.log('[idleraiders-logs] All workers stopped')
}

export default { startWorkers, stopWorkers }
