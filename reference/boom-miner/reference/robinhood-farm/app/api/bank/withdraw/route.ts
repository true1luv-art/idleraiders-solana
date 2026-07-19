/**
 * POST /api/bank/withdraw
 *
 * Withdraws coins from the player's in-game balance and sends the equivalent
 * $HFARM from the treasury wallet to the player's on-chain address.
 *
 * The on-chain transfer is executed inside withdrawCoins (bank.server.ts)
 * BEFORE any MongoDB mutation. The txHash is returned to the client for
 * the player to view on the block explorer.
 *
 * Rules (enforced in bank.server.ts):
 *   - Once per UTC calendar day
 *   - amount must be ≥ 1 and ≤ (stash − withdrawnToday)
 *   - stash must be > 0 (player must have burned coins first)
 *   - Treasury on-chain balance must cover the amount
 *
 * Response: { coins, stash, withdrawnToday, nextWithdrawAt, txHash }
 */

import { getWallet }       from "@/lib/api/get-wallet";
import { apiError, apiOk } from "@/lib/api/error-response";
import { withdrawCoins }   from "@/lib/modules/players/repository.server";

export async function POST(req: Request) {
  const wallet = await getWallet(req);
  if (!wallet) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  let body: { amount?: unknown };
  try { body = await req.json(); } catch { return apiError("Invalid JSON", "INVALID_JSON", 400); }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 1) {
    return apiError("amount must be a positive number", "INVALID_AMOUNT", 400);
  }

  try {
    const result = await withdrawCoins(wallet, Math.floor(amount));
    return apiOk(result);
  } catch (err) {
    const e = err as { message: string; code?: string; nextWithdrawAt?: number; available?: number };
    const statusMap: Record<string, number> = {
      INVALID_AMOUNT:          400,
      NO_STASH:                422,
      ALREADY_WITHDRAWN_TODAY: 429,
      EXCEEDS_LIMIT:           422,
      INSUFFICIENT_COINS:      422,
      TREASURY_INSUFFICIENT:   503,
      TX_REVERTED:             502,
      NOT_FOUND:               404,
    };
    return apiError(e.message, e.code ?? "BANK_ERROR", statusMap[e.code ?? ""] ?? 500);
  }
}
