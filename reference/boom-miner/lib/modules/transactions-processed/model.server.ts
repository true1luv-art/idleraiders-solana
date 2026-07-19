import mongoose, { Schema, Model } from "mongoose";
import type { IProcessedTransaction } from "./types.server";

export type { IProcessedTransaction } from "./types.server";

const ProcessedTransactionSchema = new Schema<IProcessedTransaction>(
  {
    /** On-chain signature — unique idempotency guard for the ledger. */
    txHash:      { type: String, required: true, unique: true, index: true },
    wallet:      { type: String, required: true },
    type:        { type: String, required: true, enum: ["withdrawal", "mint"], default: "withdrawal" },
    amount:      { type: Number, required: true },
    processedAt: { type: Number, required: true },
  },
  { collection: "transactions_processed" },
);

// Per-player history, newest-first.
ProcessedTransactionSchema.index({ wallet: 1, processedAt: -1 });

export const ProcessedTransactionModel: Model<IProcessedTransaction> =
  mongoose.models.ProcessedTransaction ??
  mongoose.model<IProcessedTransaction>("ProcessedTransaction", ProcessedTransactionSchema);
