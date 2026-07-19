/**
 * POST /api/demo/start
 *
 * Spins up a throw-away demo account so visitors can try the game without a
 * wallet.  Every call creates a brand-new, uniquely-keyed demo player:
 *
 *  1. Generates a unique demo wallet address (demo:<uuid>).
 *  2. Creates a player with 100 000 000 $BMCOIN.
 *  3. Mints 3 heroes and immediately deploys them (onMap=true).
 *  4. Signs a JWT, writes the bm_token cookie, and returns the bootstrap
 *     payload so the client can hydrate the store and redirect to /game.
 *
 * Demo players are real DB rows — they participate in the same game logic as
 * any other player.  You may want a periodic cleanup job to delete rows where
 * wallet starts with "demo:" if the collection grows too large.
 */

import { cookies } from "next/headers";
import { apiOk, apiError } from "@/lib/api/error-response";
import { signToken } from "@/lib/auth/jwt";
import { createPlayer, updatePlayerState } from "@/lib/modules/players/repository.server";
import { HeroModel } from "@/lib/modules/heroes/model.server";
import { generateHero } from "@/lib/modules/heroes/generate";
import { connectDatabase } from "@/lib/config/database";
import { HeroRarity } from "@/features/types/HeroRarity";
import { ENERGY_PER_STAMINA } from "@/lib/constants/game";

const DEMO_COINS    = 100_000_000;
const DEMO_HEROES   = 3;

/** Generates a random hex string of the given byte-length. */
function randomHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(): Promise<Response> {
  try {
    await connectDatabase();

    // 1. Unique demo wallet — prefix makes it easy to identify / clean up later.
    const demoWallet = `demo:${randomHex(16)}`;

    // 2. Create the player and immediately top up with demo coins.
    await createPlayer({ wallet: demoWallet, username: "Demo Player" });
    await updatePlayerState(demoWallet, { coins: DEMO_COINS });

    // 3. Mint DEMO_HEROES heroes, all immediately deployed (onMap=true).
    const totalBefore = await HeroModel.countDocuments();
    const rarities: HeroRarity[] = [HeroRarity.Rare, HeroRarity.Common, HeroRarity.Common];

    const seeds = Array.from({ length: DEMO_HEROES }, (_, i) => {
      const rarity = rarities[i] ?? HeroRarity.Common;
      const seed = generateHero(demoWallet, totalBefore + i + 1, rarity);
      return { ...seed, onMap: true };
    });

    const herosDocs = await HeroModel.insertMany(seeds);

    // 4. Sign the JWT and set the cookie.
    const token = await signToken({ wallet: demoWallet, demo: true });

    const cookieStore = await cookies();
    cookieStore.set("bm_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path:     "/",
      // Demo sessions expire after 2 hours.
      maxAge:   60 * 60 * 2,
    });

    // 5. Return a bootstrap-compatible payload so the client can hydrate.
    const serializedHeroes = herosDocs.map((h) => {
      const maxE = h.maxEnergy ?? h.attributes.stamina * ENERGY_PER_STAMINA;
      return {
        id:            String(h._id),
        name:          h.name,
        minted_number: h.minted_number,
        description:   "",
        image:         null,
        owner:         demoWallet,
        level:         h.level,
        rarity:        h.rarity ?? null,
        attributes: {
          power:        h.attributes.power,
          speed:        h.attributes.speed,
          stamina:      h.attributes.stamina,
          bomb_number:  h.attributes.bombNumber,
          bomb_range:   h.attributes.bombRange,
        },
        market: {
          listed:  false,
          price:   0,
          seller:  null,
          created: 0,
          sold:    0,
        },
        type:          h.type,
        rarityLabel:   h.rarity,
        currentEnergy: maxE,
        maxEnergy:     maxE,
        onMap:         true,
      };
    });

    return apiOk({
      demo: true,
      player: {
        wallet:   demoWallet,
        username: "Demo Player",
        coins:    DEMO_COINS,
        stage:    1,
      },
      heroes: serializedHeroes,
      token,
    });
  } catch (err) {
    console.error("[demo/start] error:", err);
    return apiError("Failed to start demo session", "DEMO_ERROR", 500);
  }
}
