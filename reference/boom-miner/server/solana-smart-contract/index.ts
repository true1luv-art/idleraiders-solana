/**
 * server/solana-smart-contract/index.ts
 *
 * Entry point for the Solana withdrawal settlement worker.
 * Run with: pnpm run server:solana-start
 *
 * Reads from environment (via lib/config):
 *   MONGODB_URI          — MongoDB connection string (required)
 *   SOLANA_RPC_URL       — public Solana JSON-RPC endpoint (defaults to mainnet-beta)
 *   HELIUS_API_KEY       — server-only; preferred RPC for verify + payout when set
 *   CONTRACT_ADDRESS     — SPL mint the treasury pays out (required)
 *   TREASURY_KEY         — treasury secret key, base58 or JSON byte array (required)
 *
 * Token decimals are hardcoded to 9 in lib/config.
 *
 * Worker tuning (poll interval, retry ceilings) is hardcoded in lib/config.
 * There is no withdrawal daily limit.
 *
 * Architecture:
 *   connectDatabase()  → shared Mongoose singleton
 *   TransactionWorker  → drains transactions_pending every poll interval,
 *                        settles on-chain, writes the transactions_processed ledger
 *
 * OPERATIONAL CONSTRAINT: run exactly ONE instance to preserve the sequential,
 * oldest-first settlement guarantee (no concurrent double-spends).
 */

import { connectDatabase } from "@/lib/config/database";
import { TransactionWorker, logQueueDepth } from "./workers/transaction-worker";
import { logger } from "./lib/logger";

async function main(): Promise<void> {
  await connectDatabase();
  logger.info("MongoDB connected");

  await logQueueDepth();

  const worker = new TransactionWorker();
  worker.start();

  const shutdown = (signal: string) => {
    logger.info(`${signal} received — stopping worker`);
    worker.stop();
    // Give any in-flight drain a moment to settle before exit.
    setTimeout(() => process.exit(0), 500);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("fatal startup error", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
