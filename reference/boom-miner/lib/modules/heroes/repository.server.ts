import { HeroModel } from "./model.server";
import type { IHero } from "./types.server";
import { generateHero } from "./generate";
import { HeroRarity } from "@/features/types/HeroRarity";
import { connectDatabase } from "@/lib/config/database";
import { MINT_COST, MAX_ON_MAP } from "@/lib/constants/game";
import { verifyDepositFromPlayer } from "@/lib/chain/solana/verify";
import { claimProcessedTransaction } from "@/lib/modules/transactions-processed/repository.server";

export type { IHero } from "./types.server";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getHeroesByWallet(wallet: string): Promise<IHero[]> {
  await connectDatabase();
  return HeroModel.find({ ownerWallet: wallet }).lean<IHero[]>();
}

// ---------------------------------------------------------------------------
// Starter hero (one Common hero, onMap:true)
// ---------------------------------------------------------------------------

/**
 * Ensures the player has at least one hero. If the roster is empty, creates
 * one Common starter hero with onMap=true. Returns the full roster.
 */
export async function ensureStarterHero(wallet: string): Promise<IHero[]> {
  await connectDatabase();
  const existing = await HeroModel.find({ ownerWallet: wallet }).lean<IHero[]>();
  if (existing.length > 0) return existing;

  const totalCount = await HeroModel.countDocuments();
  const seed = { ...generateHero(wallet, totalCount + 1, HeroRarity.Common), onMap: true };
  await HeroModel.create(seed);
  return HeroModel.find({ ownerWallet: wallet }).lean<IHero[]>();
}

// ---------------------------------------------------------------------------
// Mint (client-transfer)
// ---------------------------------------------------------------------------

/** Machine-readable failure codes surfaced by verifyAndMintHeroes. */
export type MintErrorCode =
  | "INVALID_MINTED_NUMBERS"
  | "ALREADY_PROCESSED"
  | "NOT_CONFIRMED"
  | "VERIFICATION_FAILED";

export interface VerifyAndMintResult {
  ok:      boolean;
  code?:   MintErrorCode;
  error?:  string;
  heroes:  IHero[];
}

/** Options controlling how the worker verifies the on-chain payment. */
export interface VerifyAndMintOptions {
  /** Confirmation polls before returning NOT_CONFIRMED. Worker passes a small value. */
  verifyMaxTries?: number;
  /** Delay between confirmation polls, in ms. */
  verifyDelayMs?: number;
}

/**
 * Verifies an on-chain player -> treasury payment and, if valid, mints
 * `count` heroes for `wallet`.
 *
 * Minting is no longer paid with in-game coins. Instead the player signs a
 * token transfer in the browser (lib/client/solana/deposit.ts); this function:
 *   1. Verifies the transfer landed on-chain: signed by `wallet`, treasury
 *      received exactly count × MINT_COST of the configured mint.
 *   2. Atomically claims the signature in the settlement ledger (unique index)
 *      so the same transaction can never mint twice.
 *   3. Inserts the hero documents.
 *
 * `mintedNumbers` are the sequential display numbers assigned by the client —
 * one per hero, in order. Stored as-is.
 */
export async function verifyAndMintHeroes(
  wallet: string,
  count: number,
  mintedNumbers: number[],
  txId: string,
  opts: VerifyAndMintOptions = {},
): Promise<VerifyAndMintResult> {
  await connectDatabase();

  if (mintedNumbers.length !== count) {
    return { ok: false, code: "INVALID_MINTED_NUMBERS", error: "minted_numbers length mismatch", heroes: [] };
  }

  const cost = count * MINT_COST;

  // 1. Verify the on-chain transfer before touching the DB. In the worker we
  //    poll only briefly and let the queue retry a not-yet-confirmed payment.
  const verification = await verifyDepositFromPlayer(txId, wallet, cost, {
    maxTries: opts.verifyMaxTries,
    delayMs:  opts.verifyDelayMs,
  });
  if (!verification.valid) {
    // NOT_CONFIRMED is transient (retry); everything else is terminal.
    const code: MintErrorCode =
      verification.code === "NOT_CONFIRMED" ? "NOT_CONFIRMED" : "VERIFICATION_FAILED";
    return {
      ok:    false,
      code,
      error: verification.reason ?? "On-chain payment could not be verified",
      heroes: [],
    };
  }

  // 2. Claim the signature — atomic idempotency gate. A replay (or concurrent
  //    duplicate request) with the same txId gets claimed:false and mints nothing.
  const { claimed } = await claimProcessedTransaction({
    txHash: txId,
    wallet,
    type:   "mint",
    amount: -cost,
  });
  if (!claimed) {
    return {
      ok:    false,
      code:  "ALREADY_PROCESSED",
      error: "This payment has already been used to mint",
      heroes: [],
    };
  }

  // 3. Insert the heroes.
  const seeds = mintedNumbers.map((n) => generateHero(wallet, n));
  const docs  = await HeroModel.insertMany(seeds);
  return { ok: true, heroes: docs as unknown as IHero[] };
}

// ---------------------------------------------------------------------------
// Deploy / recall
// ---------------------------------------------------------------------------

/**
 * Toggles `onMap` for a single hero, enforcing server-side limits.
 * Returns the updated hero, or null if the constraints block the change.
 */
export async function setHeroOnMap(
  wallet: string,
  heroDocId: string,
  onMap: boolean,
): Promise<IHero | null> {
  await connectDatabase();

  const hero = await HeroModel.findOne({ _id: heroDocId, ownerWallet: wallet }).lean<IHero>();
  if (!hero) return null;

  if (onMap) {
    // Cannot deploy if energy < 1.
    if (hero.currentEnergy < 1) return null;
    // Cannot exceed MAX_ON_MAP.
    const onMapCount = await HeroModel.countDocuments({ ownerWallet: wallet, onMap: true });
    if (onMapCount >= MAX_ON_MAP) return null;
  }

  return HeroModel.findOneAndUpdate(
    { _id: heroDocId, ownerWallet: wallet },
    { $set: { onMap } },
    { new: true, lean: true },
  ) as unknown as IHero | null;
}

// ---------------------------------------------------------------------------
// Energy
// ---------------------------------------------------------------------------

/**
 * Consumes 1 energy. If energy reaches 0 the hero is recalled from the map.
 */
export async function consumeHeroEnergy(
  wallet: string,
  heroDocId: string,
): Promise<IHero | null> {
  await connectDatabase();
  const hero = await HeroModel.findOne({ _id: heroDocId, ownerWallet: wallet }, { currentEnergy: 1 }).lean<{ currentEnergy: number }>();
  if (!hero) return null;

  const next = Math.max(0, hero.currentEnergy - 1);
  return HeroModel.findOneAndUpdate(
    { _id: heroDocId, ownerWallet: wallet },
    { $set: { currentEnergy: next, ...(next === 0 ? { onMap: false } : {}) } },
    { new: true, lean: true },
  ) as unknown as IHero | null;
}

/**
 * Ticks energy regen for all resting heroes owned by `wallet`.
 * Called on a periodic cadence (Phase S). Recovers 10 % max per 5 min.
 */
export async function regenHeroEnergy(
  wallet: string,
  deltaSec: number,
): Promise<void> {
  await connectDatabase();
  const RECOVERY_FRACTION = 0.1;
  const RECOVERY_INTERVAL_SEC = 300;

  const heroes = await HeroModel.find({ ownerWallet: wallet, onMap: false }).lean<IHero[]>();
  const ops = heroes
    .filter((h) => h.currentEnergy < h.maxEnergy)
    .map((h) => {
      const gain = (h.maxEnergy * RECOVERY_FRACTION * deltaSec) / RECOVERY_INTERVAL_SEC;
      const next = Math.min(h.maxEnergy, h.currentEnergy + gain);
      return HeroModel.updateOne({ _id: h._id }, { $set: { currentEnergy: next } });
    });
  await Promise.all(ops);
}
