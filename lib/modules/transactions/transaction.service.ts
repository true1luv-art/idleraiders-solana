/**
 * Transaction Service
 * Direct (queue-free) processing for deposit, withdraw, dollar_purchase, and registration.
 * Deduplication is enforced by:
 *   1. A DB pending-tx check (one pending tx per user at a time)
 *   2. The MongoDB unique index on Transaction.transactionId (chain-tx deduplication)
 */

import crypto from 'crypto'
import type { ITransactionDocument } from './transaction.model'
import * as transactionRepo from './transaction.repository'
import * as playerRepo from '../players/player.repository'
import * as logicService from './transaction.logic'
import { type TokenSymbol, isTokenSymbol, getBalanceField } from '@/lib/config/tokens'

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const PENDING_TX_MESSAGE =
  'You already have a transaction in progress. Please wait for it to finish before submitting another.'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface QueueResult {
  success: boolean
  message: string
  transactionId?: string
  error?: string
  /**
   * Stable machine-readable failure code.
   */
  code?: 'duplicate_transaction'
}

/**
 * Detect MongoDB duplicate-key (E11000) errors raised when the same chain
 * transactionId is replayed against the unique index on Transaction.transactionId.
 */
function isDuplicateTransactionIdError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { code?: number; keyPattern?: Record<string, unknown> }
  if (e.code !== 11000) return false
  return !e.keyPattern || Object.prototype.hasOwnProperty.call(e.keyPattern, 'transactionId')
}

interface DepositMetadata {
  quantity: number
  symbol: TokenSymbol
}

interface WithdrawMetadata {
  quantity: number
  symbol: TokenSymbol
  to: string
}

interface DollarPurchaseMetadata {
  quantity: number
  expectedHive?: number
  hiveUsdAtQuote?: number
}

interface RegistrationMetadata {
  referral?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function generateTxId(): string {
  return crypto.randomUUID()
}

/**
 * Guard: ensure the user has no pending/processing transaction already.
 * The MongoDB unique index on transactionId handles chain-tx deduplication.
 */
async function checkNoPendingTx(
  username: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const pending = await transactionRepo.findPendingBySender(username, 1)
  if (pending.length > 0) {
    return { ok: false, message: PENDING_TX_MESSAGE }
  }
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Transaction Operations
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Queue a deposit transaction for processing
 */
export async function queueDeposit(
  chainTxId: string,
  username: string,
  metadata: DepositMetadata
): Promise<QueueResult> {
  const { quantity, symbol } = metadata

  if (!quantity || quantity <= 0) {
    return { success: false, message: 'Invalid quantity' }
  }
  if (!isTokenSymbol(symbol)) {
    return { success: false, message: 'Invalid symbol' }
  }

  const guard = await checkNoPendingTx(username)
  if (!guard.ok) {
    return { success: false, message: guard.message }
  }

  try {
    const tx = await transactionRepo.create({
      transactionId: chainTxId,
      sender: username,
      contract: 'tokens',
      action: 'transfer',
      status: 'pending',
      type: 'deposit',
      metadata,
      logs: {},
    })

    return {
      success: true,
      message: 'Deposit queued for processing',
      transactionId: tx._id.toString(),
    }
  } catch (error) {
    if (isDuplicateTransactionIdError(error)) {
      console.warn(
        `[idleraiders-logs] queueDeposit duplicate chainTxId=${chainTxId} from ${username}`,
      )
      return {
        success: false,
        code: 'duplicate_transaction',
        message:
          'This deposit has already been recorded. If your balance is incorrect, please contact support with the transaction ID.',
      }
    }

    console.error('[idleraiders-logs] queueDeposit Error:', error)
    return {
      success: false,
      message: 'Failed to queue deposit',
      error: (error as Error).message,
    }
  }
}

/**
 * Queue a withdrawal transaction for processing
 */
export async function queueWithdraw(username: string, metadata: WithdrawMetadata): Promise<QueueResult> {
  const { quantity, symbol, to } = metadata

  if (!quantity || quantity <= 0) {
    return { success: false, message: 'Invalid quantity' }
  }
  if (!isTokenSymbol(symbol)) {
    return { success: false, message: 'Invalid symbol' }
  }
  if (!to) {
    return { success: false, message: 'Missing recipient' }
  }

  const player = await playerRepo.findByUsername(username)
  if (!player) {
    return { success: false, message: 'Player not found' }
  }
  const balance = player[getBalanceField(symbol)]
  if (balance < quantity) {
    return { success: false, message: `Insufficient ${symbol} balance` }
  }

  const guard = await checkNoPendingTx(username)
  if (!guard.ok) {
    return { success: false, message: guard.message }
  }

  try {
    const tx = await transactionRepo.create({
      transactionId: generateTxId(),
      sender: username,
      contract: 'tokens',
      action: 'transfer',
      status: 'pending',
      type: 'withdraw',
      metadata,
      logs: {},
    })

    return {
      success: true,
      message: 'Withdrawal queued for processing',
      transactionId: tx._id.toString(),
    }
  } catch (error) {
    console.error('[idleraiders-logs] queueWithdraw Error:', error)
    return {
      success: false,
      message: 'Failed to queue withdrawal',
      error: (error as Error).message,
    }
  }
}

/**
 * Queue a dollar purchase transaction for processing
 */
export async function queueDollarPurchase(
  chainTxId: string,
  username: string,
  metadata: DollarPurchaseMetadata
): Promise<QueueResult> {
  const { quantity } = metadata

  if (!quantity || quantity < 1) {
    return { success: false, message: 'Invalid quantity' }
  }

  if (!(await logicService.isHiveUsdPriceInitialized())) {
    return { success: false, message: 'Price service unavailable, please try again shortly' }
  }

  const guard = await checkNoPendingTx(username)
  if (!guard.ok) {
    return { success: false, message: guard.message }
  }

  try {
    const { expectedHive, hiveUsdAtQuote } = await logicService.calculateExpectedHive(quantity)

    const tx = await transactionRepo.create({
      transactionId: chainTxId,
      sender: username,
      contract: 'hive',
      action: 'transfer',
      status: 'pending',
      type: 'dollar_purchase',
      metadata: { quantity, expectedHive, hiveUsdAtQuote },
      logs: {},
    })

    return {
      success: true,
      message: 'Purchase queued for processing',
      transactionId: tx._id.toString(),
    }
  } catch (error) {
    if (isDuplicateTransactionIdError(error)) {
      console.warn(
        `[idleraiders-logs] queueDollarPurchase duplicate chainTxId=${chainTxId} from ${username}`,
      )
      return {
        success: false,
        code: 'duplicate_transaction',
        message:
          'This purchase has already been recorded. If your balance is incorrect, please contact support with the transaction ID.',
      }
    }

    console.error('[idleraiders-logs] queueDollarPurchase Error:', error)
    return {
      success: false,
      message: 'Failed to queue purchase',
      error: (error as Error).message,
    }
  }
}

/**
 * Queue a registration transaction for processing
 */
export async function queueRegistration(
  chainTxId: string,
  username: string,
  metadata: RegistrationMetadata
): Promise<QueueResult> {
  const { referral } = metadata

  if (!(await logicService.isHiveUsdPriceInitialized())) {
    return { success: false, message: 'Price service unavailable, please try again shortly' }
  }

  const guard = await checkNoPendingTx(username)
  if (!guard.ok) {
    return { success: false, message: guard.message }
  }

  try {
    const tx = await transactionRepo.create({
      transactionId: chainTxId,
      sender: username,
      contract: 'hive',
      action: 'transfer',
      status: 'pending',
      type: 'registration',
      metadata: { referral },
      logs: {},
    })

    return {
      success: true,
      message: 'Registration queued for processing',
      transactionId: tx._id.toString(),
    }
  } catch (error) {
    if (isDuplicateTransactionIdError(error)) {
      console.warn(
        `[idleraiders-logs] queueRegistration duplicate chainTxId=${chainTxId} from ${username}`,
      )
      return {
        success: false,
        code: 'duplicate_transaction',
        message:
          'This registration has already been recorded. If you cannot access your account, please contact support with the transaction ID.',
      }
    }

    console.error('[idleraiders-logs] queueRegistration Error:', error)
    return {
      success: false,
      message: 'Failed to queue registration',
      error: (error as Error).message,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Transaction Status
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get transaction status by ID
 */
export async function getTransactionStatus(transactionId: string): Promise<{
  status: string
  type: string
  logs?: Record<string, unknown>
} | null> {
  const tx = await transactionRepo.findById(transactionId)
  if (!tx) return null

  return {
    status: tx.status,
    type: tx.type,
    logs: tx.logs,
  }
}

/**
 * Get pending transactions for a user
 */
export async function getPendingTransactions(username: string): Promise<{
  id: string
  type: string
  status: string
  createdAt: Date
}[]> {
  const transactions = await transactionRepo.findPendingBySender(username, 10)

  return transactions.map(tx => ({
    id: tx._id.toString(),
    type: tx.type,
    status: tx.status,
    createdAt: tx.createdAt,
  }))
}
