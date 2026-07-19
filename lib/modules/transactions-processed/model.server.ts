/**
 * lib/modules/transactions-processed/model.server.ts
 *
 * Mongoose model for the immutable settlement ledger (`transactions_processed`).
 *
 * SERVER-ONLY.
 */

import mongoose, { Schema, Model } from 'mongoose'
import type { IProcessedTransaction } from './types.server'

export type { IProcessedTransaction } from './types.server'

const ProcessedTransactionSchema = new Schema<IProcessedTransaction>(
  {
    /** On-chain signature — unique idempotency guard. */
    txHash:      { type: String, required: true, unique: true, index: true },
    wallet:      { type: String, required: true },
    type:        {
      type: String,
      required: true,
      enum: ['deposit', 'withdrawal', 'purchase'] as const,
    },
    /**
     * Net coin delta. Positive for deposits/purchases, negative for withdrawals.
     */
    amount:      { type: Number, required: true },
    processedAt: { type: Number, required: true },
  },
  { collection: 'transactions_processed' },
)

// Per-player history, newest-first.
ProcessedTransactionSchema.index({ wallet: 1, processedAt: -1 })

export const ProcessedTransactionModel: Model<IProcessedTransaction> =
  mongoose.models.ProcessedTransaction ??
  mongoose.model<IProcessedTransaction>('ProcessedTransaction', ProcessedTransactionSchema)
