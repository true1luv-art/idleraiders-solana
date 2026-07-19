/**
 * GET /api/player/[wallet]/profile
 *
 * Returns a public profile for a given wallet address.
 * Auth: none — profiles are public.
 */

import { findPlayerByWallet } from "@/lib/modules/players/repository.server";
import { apiError } from "@/lib/api/error-response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ wallet: string }> },
) {
  const { wallet } = await params;

  const player = await findPlayerByWallet(wallet);

  if (!player) {
    return apiError("Player not found", "PLAYER_NOT_FOUND", 404);
  }

  return Response.json({
    wallet:           player.wallet,
    username:         player.username ?? null,
    registrationTime: player.registrationTime,
    reputationPoints: player.reputationPoints ?? 0,
    skills:           player.skills ?? {},
  });
}
