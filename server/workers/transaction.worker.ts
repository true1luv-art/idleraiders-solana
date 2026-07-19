/**
 * Transaction Worker
 * Polls for pending transactions and processes them directly (no BullMQ).
 * Uses a simple interval-based polling loop to pick up pending/processing
 * transactions and drive them through the processor.
 */

import type { Server } from 'socket.io'
import Transaction from '../../lib/modules/transactions/transaction.model'
import * as processor from '../../lib/modules/transactions/transaction.processor'
import { initializeSocketRefs } from '../../lib/modules/transactions/transaction.processor'
import { userSockets } from '../sockets/socket.manager'

// ═══════════════════════════════════════════════════════════════════════════════
// Worker State
// ═══════════════════════════════════════════════════════════════════════════════

let pollInterval: ReturnType<typeof setInterval> | null = null
let workerIo: Server | null = null
const POLL_INTERVAL_MS = 5000 // Poll every 5 seconds

// ═══════════════════════════════════════════════════════════════════════════════
// Job Processor
// ═══════════════════════════════════════════════════════════════════════════════

async function processPendingTransactions(): Promise<void> {
  if (!workerIo) return

  try {
    // Pick up pending/processing transactions (limit batch to 10 per cycle)
    const pending = await Transaction.find({ status: { $in: ['pending', 'processing'] } })
      .sort({ createdAt: 1 })
      .limit(10)
      .lean()

    for (const txDoc of pending) {
      try {
        const tx = await Transaction.findById(txDoc._id)
        if (!tx) continue
        if (tx.status === 'completed' || tx.status === 'failed') continue

        if (tx.status === 'pending') {
          tx.status = 'processing'
          await tx.save()
        }

        console.log(
          `[idleraiders-logs] Processing ${tx.type} transaction for ${tx.sender} (${tx._id})`,
        )

        switch (tx.type) {
          case 'deposit':
            await processor.processDeposit(tx, workerIo)
            break
          case 'withdraw':
            await processor.processWithdraw(tx, workerIo)
            break
          case 'dollar_purchase':
            await processor.processDollarPurchase(tx, workerIo)
            break
          case 'registration':
            await processor.processRegistration(tx, workerIo)
            break
          default:
            console.warn(`[idleraiders-logs] Unknown transaction type: ${tx.type}`)
            tx.status = 'failed'
            tx.logs = { failureCheckpoint: 'unknownType', type: tx.type }
            await tx.save()
        }

        console.log(
          `[idleraiders-logs] Completed ${tx.type} for ${tx.sender} - Status: ${tx.status}`,
        )
      } catch (err) {
        console.error(
          `[idleraiders-logs] Error processing transaction ${txDoc._id}:`,
          (err as Error).message,
        )
      }
    }
  } catch (err) {
    console.error('[idleraiders-logs] Poll error:', (err as Error).message)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Worker Lifecycle
// ═══════════════════════════════════════════════════════════════════════════════

export function initializeTransactionWorker(io: Server): void {
  if (pollInterval) return

  workerIo = io
  initializeSocketRefs(io, userSockets)

  pollInterval = setInterval(processPendingTransactions, POLL_INTERVAL_MS)
  console.log(
    `[idleraiders-logs] Transaction worker initialized (polling every ${POLL_INTERVAL_MS / 1000}s)`,
  )
}

export async function closeTransactionWorker(): Promise<void> {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  workerIo = null
  console.log('[idleraiders-logs] Transaction worker closed')
}

export default {
  initializeTransactionWorker,
  closeTransactionWorker,
}
