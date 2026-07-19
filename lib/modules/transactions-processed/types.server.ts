/**
 * lib/modules/transactions-processed/types.server.ts
 *
 * Types for the permanent settlement ledger (`transactions_processed`).
 * One row per settled transaction — the audit + history source of truth.
 *
 * No mongoose runtime code — only interfaces live here.
 */

import type { Document } from 'mongoose'

export type ProcessedTxType = 'deposit' | 'withdrawal' | 'purchase'

export interface IProcessedTransaction extends Document {
  /**
   * On-chain Solana signature (base58), Hive tx id, or Robinhood tx hash.
   * Unique index — the idempotency guard for the ledger.
   * For withdrawals this is the treasury→player on-chain signature.
   */
  txHash: string

  /** Player wallet address (Solana public key, Hive username, or EVM address). */
  wallet: string

  type: ProcessedTxType

  /**
   * Net coin delta applied to the player.
   * Positive for deposits and purchases, negative for withdrawals.
   */
  amount: number

  /** Unix ms the settlement was recorded. */
  processedAt: number
}
