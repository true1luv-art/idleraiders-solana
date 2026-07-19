/**
 * POST /api/bank/deposit/verify
 *
 * Verifies an on-chain $HFARM transfer from the player to the treasury and,
 * on success, credits the equivalent amount to the player's in-game balance.
 *
 * Request body: { txHash: string, amount: number }
 *
 * Flow:
 *   1. Authenticate via JWT / cookie.
 *   2. Validate body.
 *   3. Call verifyAndCreditDeposit — which checks idempotency, verifies the
 *      on-chain Transfer event, inserts the idempotency guard, and increments
 *      player.coins atomically.
 *   4. Return { coins } on success.
 *
 * Response: { coins: number }
 */

import { getWallet }       from "@/lib/api/get-wallet";
import { apiError, apiOk } from "@/lib/api/error-response";
import { verifyAndCreditDeposit } from "@/lib/modules/players/repository.server";

export async function POST(req: Request) {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  let body: { txHash?: unknown; amount?: unknown };
  try { body = await req.json(); } catch { return apiError("Invalid JSON", "INVALID_JSON", 400); }

  const txHash = typeof body.txHash === "string" ? body.txHash.trim() : null;
  const amount = Number(body.amount);

  if (!txHash) {
    return apiError("txHash is required", "INVALID_TX_HASH", 400);
  }
  if (!Number.isFinite(amount) || amount < 1) {
    return apiError("amount must be a positive number ≥ 1", "INVALID_AMOUNT", 400);
  }

  try {
    const result = await verifyAndCreditDeposit(wallet, txHash, Math.floor(amount));
    return apiOk(result);
  } catch (err) {
    const e = err as { message: string; code?: string };
    const statusMap: Record<string, number> = {
      INVALID_AMOUNT:      400,
      INVALID_TX_HASH:     400,
      ALREADY_PROCESSED:   409,
      VERIFICATION_FAILED: 422,
      NOT_FOUND:           404,
    };
    return apiError(e.message, e.code ?? "DEPOSIT_ERROR", statusMap[e.code ?? ""] ?? 500);
  }
}
