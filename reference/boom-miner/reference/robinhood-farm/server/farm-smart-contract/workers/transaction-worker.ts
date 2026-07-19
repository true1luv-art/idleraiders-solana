/**
 * server/farm-smart-contract/workers/transaction-worker.ts
 *
 * Single worker that drains `transactions_pending` on a recurring cycle.
 *
 * The frontend creates a pending row for every player-initiated transaction:
 *   "deposit"              → verify on-chain tx and credit coins
 *   "withdrawal"           → debit coins and send $HFARM on-chain
 *   "marketplace_purchase" → settle the trade (debit buyer, credit seller, transfer item)
 *
 * Flow per cycle:
 *   1. Snapshot all pending/failed rows oldest-first.
 *   2. Process each row sequentially (prevents double-spend on same listing).
 *   3. completeJob (delete) on success or deterministic non-ok result.
 *   4. failJob (retry → dead-letter after maxRetries) on transient errors.
 *
 * Clients learn about completed transactions by polling GET /api/transactions.
 */

import {
  listPendingOldestFirst,
  completeJob,
  failJob,
  countJobsByStatus,
} from "../../../lib/modules/transactions-pending/repository.server";
import { verifyAndCreditDeposit } from "../../../lib/modules/players/repository.server";
import { withdrawCoins }          from "../../../lib/modules/players/repository.server";
import { settlePurchase }         from "../../../lib/modules/listings/repository.server";
import { log }                    from "../lib/logger";

const POLL_INTERVAL = 5_000; // ms between drain cycles

let timer:      ReturnType<typeof setTimeout> | null = null;
let processing = false;

async function drain(): Promise<void> {
  const rows = await listPendingOldestFirst(0);
  if (rows.length === 0) return;

  log.info("tx-worker", `Draining ${rows.length} pending row(s)`);

  for (const row of rows) {
    const { _id, type } = row;

    // ── Deposit ──────────────────────────────────────────────────────────────
    if (type === "deposit") {
      try {
        const result = await verifyAndCreditDeposit(row.sender, row.signature, row.tokenAmount);
        await completeJob(_id);
        log.info("tx-worker", "Deposit settled", {
          txHash:   row.signature,
          wallet:   row.sender,
          coinsNow: result.coins,
        });
      } catch (err) {
        const code    = (err as { code?: string }).code;
        const message = err instanceof Error ? err.message : String(err);

        if (code === "ALREADY_PROCESSED") {
          await completeJob(_id);
          log.info("tx-worker", "Deposit already processed — removing queue row", { txHash: row.signature });
          continue;
        }

        const dead = await failJob(_id, message);
        log.warn("tx-worker", `Deposit failed — ${dead ? "DEAD-LETTERED" : "will retry"}`, {
          txHash: row.signature,
          wallet: row.sender,
          error:  message,
        });
      }
      continue;
    }

    // ── Withdrawal ────────────────────────────────────────────────────────────
    if (type === "withdrawal") {
      try {
        if (!row.walletAddress || !row.withdrawAmount) {
          throw new Error("withdrawal row missing walletAddress or withdrawAmount");
        }

        const result = await withdrawCoins(row.walletAddress, row.withdrawAmount);
        await completeJob(_id);
        log.info("tx-worker", "Withdrawal settled", {
          wallet: row.walletAddress,
          amount: row.withdrawAmount,
          txHash: result.txHash,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const dead    = await failJob(_id, message);
        log.warn("tx-worker", `Withdrawal failed — ${dead ? "DEAD-LETTERED" : "will retry"}`, {
          wallet: row.walletAddress,
          amount: row.withdrawAmount,
          error:  message,
        });
      }
      continue;
    }

    // ── Marketplace purchase ──────────────────────────────────────────────────
    if (type === "marketplace_purchase") {
      try {
        if (!row.listingId || !row.buyerWallet) {
          throw new Error("marketplace_purchase row missing listingId or buyerWallet");
        }

        const result = await settlePurchase({
          listingId:   row.listingId,
          buyerWallet: row.buyerWallet,
          quantity:    row.quantity,
        });

        await completeJob(_id);

        if (result.status === "ok") {
          log.info("tx-worker", "Marketplace purchase settled", {
            listingId:  result.listingId,
            buyer:      row.buyerWallet,
            totalPrice: result.totalPrice,
          });
        } else {
          // Deterministic non-ok (sold out, insufficient balance, etc.) — no retry.
          log.warn("tx-worker", "Marketplace purchase non-ok (no retry)", {
            listingId: row.listingId.toString(),
            buyer:     row.buyerWallet,
            status:    result.status,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const dead    = await failJob(_id, message);
        log.warn("tx-worker", `Marketplace purchase failed — ${dead ? "DEAD-LETTERED" : "will retry"}`, {
          listingId: row.listingId?.toString(),
          buyer:     row.buyerWallet,
          error:     message,
        });
      }
      continue;
    }

    log.warn("tx-worker", `Unknown transaction type — skipping`, { id: _id, type });
  }
}

async function cycle(): Promise<void> {
  if (!processing) {
    processing = true;
    try {
      await drain();
    } catch (err) {
      log.error("tx-worker", "Drain cycle error", err);
    } finally {
      processing = false;
    }
  }
  timer = setTimeout(cycle, POLL_INTERVAL);
}

export function startTransactionWorker(): void {
  log.info("tx-worker", `Starting transaction worker (poll every ${POLL_INTERVAL / 1000}s)`);

  countJobsByStatus()
    .then((counts) => log.info("tx-worker", "Boot queue stats", counts))
    .catch(() => { /* non-fatal */ });

  timer = setTimeout(cycle, 2_000);
}

export function stopTransactionWorker(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}
