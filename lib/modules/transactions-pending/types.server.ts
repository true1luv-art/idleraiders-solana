/**
 * lib/modules/transactions-pending/types.server.ts
 *
 * Types for the durable work queue (`transactions_pending`).
 * One row per requested deposit, withdrawal, or purchase, drained sequentially
 * by the solana-smart-contract worker.
 *
 * No mongoose runtime code — only interfaces live here.
 */

import type { Document } from 'mongoose'

export type PendingTxStatus = 'pending' | 'failed' | 'dead'

export type PendingTxType = 'deposit' | 'withdrawal' | 'purchase'

export interface IPendingTransaction extends Document {
  type: PendingTxType
  /**
   * Idempotency key — unique across the queue.
   * - deposit / purchase: the on-chain transfer signature (txId) the player signed.
   * - withdrawal: a server-generated UUID.
   */
  signature: string

  /** Player's Solana address, Hive username, or Robinhood EVM address. */
  walletAddress: string

  // ---- deposit fields -----------------------------------------------------
  /** Token amount the player sent to treasury. Present for deposit and purchase. */
  amount?: number

  // ---- withdrawal fields --------------------------------------------------
  /** Whole coins requested. Present only when type === "withdrawal". */
  withdrawAmount?: number

  // ---- purchase fields ----------------------------------------------------
  /** In-game item identifier (e.g. "card_pack"). Present for purchase. */
  itemId?: string

  // ---- lifecycle ----------------------------------------------------------
  status: PendingTxStatus
  retryCount: number
  lastError?: string

  // timestamps: true → managed by mongoose
  createdAt: Date
  updatedAt: Date
}
