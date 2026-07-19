/**
 * lib/modules/farms/repository.server.ts
 *
 * Data-access layer for the `farms` collection. §2.1-A / §2.1-D
 *
 * All queries are scoped to `playerId` (wallet address).
 * createInitialFarm() seeds the same initial state as the Phaser client's
 * INITIAL_FARM constant so that new players start with identical data on
 * both client and server.
 */

import { FarmModel } from "@/lib/modules/farms/model.server";
import type { IFarm } from "@/lib/modules/farms/types.server";
import type { EmbeddedQuest } from "@/features/types/quests";
import type { PlayerSkills }  from "@/features/types/players";
import { connectDatabase } from "@/lib/config/database";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Returns the farm document for `playerId`, or null if none exists.
 * Does NOT create a farm if missing — call `createInitialFarm` for that. §2.1-D
 */
export async function getFarm(playerId: string): Promise<IFarm | null> {
  await connectDatabase();
  return FarmModel.findOne({ playerId }).lean<IFarm>();
}

/**
 * Returns the farm document if it exists, otherwise creates and returns
 * the initial farm seed. Use this on first farm visit. §2.1-D
 */
export async function getOrCreateFarm(playerId: string): Promise<IFarm> {
  await connectDatabase();
  const existing = await FarmModel.findOne({ playerId }).lean<IFarm>();
  if (existing) return existing;
  return createInitialFarm(playerId);
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Atomically updates any subset of the farm document.
 * Caller passes a MongoDB update expression (e.g. `{ $set: { ... } }`).
 * Returns the updated document. §2.1-A
 */
export async function upsertFarm(
  playerId: string,
  updateExpr: Record<string, unknown>,
): Promise<IFarm | null> {
  await connectDatabase();
  return FarmModel.findOneAndUpdate(
    { playerId },
    updateExpr,
    { new: true, upsert: true, lean: true },
  );
}

/**
 * Applies a partial patch to the farm using `$set`.
 * Convenience wrapper around `upsertFarm` for simple field updates.
 */
export async function patchFarm(
  playerId: string,
  patch: Partial<Record<string, unknown>>,
): Promise<IFarm | null> {
  return upsertFarm(playerId, { $set: patch });
}

// ---------------------------------------------------------------------------
// 2.1-D — Initial farm seed
// ---------------------------------------------------------------------------

/**
 * Creates and persists the INITIAL_FARM document for a new player. §2.1-D
 *
 * Node counts mirror the world position arrays in phaser/positions/:
 *   - 8 wood trees  (TREE_POSITIONS)
 *   - 6 stone rocks (STONE_POSITIONS)
 *   - 3 iron nodes  (IRON_POSITIONS)
 *   - 2 gold nodes  (GOLD_POSITIONS)
 *
 * `amount` is NOT stored — it is static config (always 1 in Phase 2) injected
 * at hydration time by buildResourceNodes() in build-state.ts.
 *
 * The inventory (initial seeds + crops) is seeded separately in the
 * `inventories` collection by `createInitialInventory()`. §2.1-B
 */
export async function createInitialFarm(playerId: string): Promise<IFarm> {
  await connectDatabase();
  const now = Date.now();

  const doc = new FarmModel({
    playerId,

    // 3 crop plots with Potato pre-planted (plantedAt=0 → harvestable immediately)
    fields: {
      "0": { name: "Potato", plantedAt: 0 },
      "1": { name: "Potato", plantedAt: 0 },
      "2": { name: "Potato", plantedAt: 0 },
    },

    // 8 wood trees — matches TREE_POSITIONS (tree_01 … tree_08)
    trees: {
      "0": { name: "Wood" },
      "1": { name: "Wood" },
      "2": { name: "Wood" },
      "3": { name: "Wood" },
      "4": { name: "Wood" },
      "5": { name: "Wood" },
      "6": { name: "Wood" },
      "7": { name: "Wood" },
    },

    // 6 stone rocks — matches STONE_POSITIONS (stone_01 … stone_06)
    stones: {
      "0": { name: "Stone" },
      "1": { name: "Stone" },
      "2": { name: "Stone" },
      "3": { name: "Stone" },
      "4": { name: "Stone" },
      "5": { name: "Stone" },
    },

    // 3 iron nodes — matches IRON_POSITIONS (iron_01 … iron_03)
    iron: {
      "0": { name: "Iron" },
      "1": { name: "Iron" },
      "2": { name: "Iron" },
    },

    // 2 gold nodes — matches GOLD_POSITIONS (gold_01, gold_02)
    gold: {
      "0": { name: "Gold" },
      "1": { name: "Gold" },
    },

    // No animals placed yet
    chickens: {},
    cows:     {},
    sheep:    {},

    fishing: {
      lastCastAt:     0,
      lastCaughtFish: null,
    },

    cooking: null,

    stamina: {
      current: 100,
      max: 100,
      lastRegenAt: now,
    },

    quests: {
      daily: [],
    },

    milestones: {},
  });

  await doc.save();
  return doc.toObject() as IFarm;
}

/**
 * Lazily expires stale quests and generates fresh ones when needed.
 *
 * Called at the top of GET /api/farm and GET /api/quests so every farm read
 * returns an up-to-date quest board with no background job.
 *
 * @param wallet       - Player wallet address.
 * @param farm         - Current lean farm document.
 * @param generators   - Injected quest-engine functions (avoids circular imports).
 * @param playerSkills - Player skills used by the generators.
 * @returns            - Up-to-date embedded quests (freshly persisted if changed).
 */
export async function refreshQuestsIfStale(
  wallet: string,
  farm: IFarm,
  generators: {
    generateDailyQuests: (skills: PlayerSkills) => Promise<EmbeddedQuest[]>;
  },
  playerSkills: PlayerSkills,
): Promise<{ daily: EmbeddedQuest[] }> {
  const now = Date.now();
  let changed = false;

  let daily: EmbeddedQuest[] = (farm.quests?.daily ?? []) as EmbeddedQuest[];

  const dailyExpired = daily.length === 0 || daily.some((q) => now > q.expiresAt);
  if (dailyExpired) {
    daily = await generators.generateDailyQuests(playerSkills);
    changed = true;
  }

  if (changed) {
    await saveQuests(wallet, { daily });
  }

  return { daily };
}

/**
 * Deletes the farm document for `playerId`.
 * Used in tests and the migration endpoint. §2.5-E
 */
export async function deleteFarm(playerId: string): Promise<void> {
  await connectDatabase();
  await FarmModel.deleteOne({ playerId });
}

// ---------------------------------------------------------------------------
// §fold-quests — Quest persistence primitive
// ---------------------------------------------------------------------------

/**
 * Persists a new set of daily quests onto the farm document.
 * Pure DB write — no staleness checks or generation logic here; that lives
 * in `refreshQuestsIfStale` above.
 */
export async function saveQuests(
  wallet: string,
  quests: { daily: EmbeddedQuest[] },
): Promise<void> {
  await connectDatabase();
  await FarmModel.findOneAndUpdate(
    { playerId: wallet },
    { $set: { "quests.daily": quests.daily } },
    { new: false },
  );
}

/**
 * Marks a daily quest as completed on the farm document (atomic $set on the
 * matching embedded quest by `id`).
 *
 * Uses an array-filter update so only the target element is mutated.
 * Returns true if the quest was found and updated, false if already completed.
 */
export async function completeQuestOnFarm(
  wallet:  string,
  questId: string,
): Promise<boolean> {
  await connectDatabase();
  const result = await FarmModel.updateOne(
    {
      playerId: wallet,
      "quests.daily": { $elemMatch: { id: questId, status: "active" } },
    },
    {
      $set: {
        "quests.daily.$[elem].status":      "completed",
        "quests.daily.$[elem].completedAt": Date.now(),
      },
    },
    {
      arrayFilters: [{ "elem.id": questId, "elem.status": "active" }],
    },
  );

  return result.modifiedCount > 0;
}
