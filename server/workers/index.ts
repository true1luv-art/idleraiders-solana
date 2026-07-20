/**
 * Workers Index
 * Initialize all background workers
 */

import { initializeDrainWorker, closeDrainWorker } from '../solana-smart-contract/workers/drain.worker'

/**
 * Start all workers
 */
export async function startWorkers(): Promise<void> {
  console.log('[idleraiders-logs] Starting workers...')

  // Durable transaction queue worker (deposit / withdrawal / purchase).
  // No socket dependency — client polls /api/transactions for settlement.
  initializeDrainWorker()

  console.log('[idleraiders-logs] All workers initialized')
}

/**
 * Stop all workers gracefully
 */
export async function stopWorkers(): Promise<void> {
  console.log('[idleraiders-logs] Stopping workers...')

  await closeDrainWorker()

  console.log('[idleraiders-logs] All workers stopped')
}

export default { startWorkers, stopWorkers }
