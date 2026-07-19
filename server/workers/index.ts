/**
 * Workers Index
 * Initialize all background workers
 */

import { initializePriceWorker, stopPriceWorker } from './worker.price'
import { initializeDrainWorker, closeDrainWorker } from '../solana-smart-contract/workers/drain.worker'
import { getIO } from '../sockets/socket.manager'

/**
 * Start all workers
 */
export async function startWorkers(): Promise<void> {
  console.log('[idleraiders-logs] Starting workers...')

  const io = getIO()
  if (io) {
    // Durable transaction queue worker (deposit / withdrawal / purchase).
    initializeDrainWorker(io)
  } else {
    console.warn('[idleraiders-logs] Socket.IO not initialized, transaction workers skipped')
  }

  // Initialize price worker (cron-based)
  initializePriceWorker()

  console.log('[idleraiders-logs] All workers initialized')
}

/**
 * Stop all workers gracefully
 */
export async function stopWorkers(): Promise<void> {
  console.log('[idleraiders-logs] Stopping workers...')

  await closeDrainWorker()
  stopPriceWorker()

  console.log('[idleraiders-logs] All workers stopped')
}

export default { startWorkers, stopWorkers }
