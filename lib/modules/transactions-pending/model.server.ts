/**
 * lib/modules/transactions-pending/model.server.ts
 *
 * Mongoose model for the durable work queue (`transactions_pending`).
 * Covers deposit, withdrawal, and purchase job types.
 *
 * SERVER-ONLY.
 */

import mongoose, { Schema, Model } from 'mongoose'
import type { IPendingTransaction } from './types.server'

export type { IPendingTransaction } from './types.server'

const PendingTransactionSchema = new Schema<IPendingTransaction>(
  {
    type: {
      type: String,
      required: true,
      enum: ['deposit', 'withdrawal', 'purchase'] as const,
    },
    /** Idempotency key — unique across the queue. */
    signature: { type: String, required: true, unique: true, index: true },

    walletAddress: { type: String, required: true },

    // deposit / purchase fields
    amount: {
      type: Number,
      required: function (this: IPendingTransaction) {
        return this.type === 'deposit' || this.type === 'purchase'
      },
    },

    // withdrawal fields
    withdrawAmount: {
      type: Number,
      required: function (this: IPendingTransaction) {
        return this.type === 'withdrawal'
      },
    },

    // purchase fields
    itemId: { type: String },

    status: {
      type: String,
      required: true,
      enum: ['pending', 'failed', 'dead'] as const,
      default: 'pending',
    },
    retryCount: { type: Number, default: 0 },
    lastError:  { type: String },
  },
  { collection: 'transactions_pending', timestamps: true },
)

// Drain index — worker queries { status: { $in: ["pending","failed"] } } oldest-first.
PendingTransactionSchema.index({ status: 1, createdAt: 1 })

export const PendingTransactionModel: Model<IPendingTransaction> =
  mongoose.models.PendingTransaction ??
  mongoose.model<IPendingTransaction>('PendingTransaction', PendingTransactionSchema)
