/**
 * lib/modules/transactions-processed/types.server.ts
 *
 * Types for the permanent settlement ledger (`transactions_processed`).
 * One row per settled withdrawal — the audit + history source of truth.
 *
 * No mongoose runtime code — only interfaces live here.
 */

import type { Document } from "mongoose";

/** Union kept open so deposit / marketplace types can be added later. */
export type ProcessedTransactionType = "withdrawal" | "mint";

export interface IProcessedTransaction extends Document {
  /** On-chain Solana signature (base58) for withdrawals. Unique index. */
  txHash: string;
  /** Player wallet the settlement applies to. */
  wallet: string;
  type: ProcessedTransactionType;
  /** Net coin delta for the player. Negative for withdrawals. */
  amount: number;
  /** Unix ms the settlement was recorded. */
  processedAt: number;
}
