/**
 * POST /api/bank/burn
 *
 * Burns coins to raise the player's stash (daily withdrawal ceiling).
 *
 * Rules (enforced in bank.server.ts):
 *   - amount must be a positive integer divisible by 100
 *   - amount must be ≤ player.coins
 *   - stash increases by floor(amount × 0.25)
 *   - burn is irreversible
 *
 * Response: { coins, stash, stashGained }
 */

import { getWallet }    from "@/lib/api/get-wallet";
import { apiError, apiOk } from "@/lib/api/error-response";
import { burnCoins }    from "@/lib/modules/players/repository.server";

export async function POST(req: Request) {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  let body: { amount?: unknown };
  try { body = await req.json(); } catch { return apiError("Invalid JSON", "INVALID_JSON", 400); }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return apiError("amount must be a positive number", "INVALID_AMOUNT", 400);
  }

  try {
    const result = await burnCoins(wallet, Math.floor(amount));
    return apiOk(result);
  } catch (err) {
    const e = err as { message: string; code?: string };
    const statusMap: Record<string, number> = {
      INVALID_AMOUNT:    400,
      NOT_DIVISIBLE:     400,
      INSUFFICIENT_COINS: 422,
      NOT_FOUND:         404,
    };
    return apiError(e.message, e.code ?? "BANK_ERROR", statusMap[e.code ?? ""] ?? 500);
  }
}
