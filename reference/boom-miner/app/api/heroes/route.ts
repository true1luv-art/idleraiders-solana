import { apiOk, apiError } from "@/lib/api/error-response";
import { getWallet } from "@/lib/api/get-wallet";
import { ensureStarterHero } from "@/lib/modules/heroes/repository.server";

/**
 * GET /api/heroes
 *
 * Returns the authenticated player's hero roster.
 * Auto-creates the starter Common hero if the roster is empty.
 */
export async function GET(req: Request): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) {
    return apiError("Not authenticated", "UNAUTHORIZED", 401);
  }

  const heroes = await ensureStarterHero(wallet);
  return apiOk({ heroes });
}
