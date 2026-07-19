import { StageMapModel } from "./model.server";
import type { IStageMap } from "./types.server";
import { generateStageMap, rollSeed } from "./generate";
import { connectDatabase } from "@/lib/config/database";
import { MAP_WIDTH, MAP_HEIGHT } from "@/features/types/TileTypes";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getStageMap(playerId: string): Promise<IStageMap | null> {
  await connectDatabase();
  return StageMapModel.findOne({ playerId }).lean<IStageMap>();
}

/**
 * Returns the active stage map for a player, or generates and persists a fresh
 * one if none exists. The `stage` parameter is informational (used for logging)
 * — the document is keyed by wallet only (one map per player at a time).
 *
 * Alias for getOrCreateStageMap; exported for use in the bootstrap route and
 * any other callers that want the semantically-named variant.
 */
export async function getStageMapForPlayer(
  wallet: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _stage?: number,
): Promise<IStageMap> {
  return getOrCreateStageMap(wallet);
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Returns the existing stage map for a player, or generates and persists a
 * fresh one if none exists. This is the load-time call.
 */
export async function getOrCreateStageMap(playerId: string): Promise<IStageMap> {
  await connectDatabase();
  const existing = await StageMapModel.findOne({ playerId }).lean<IStageMap>();
  if (existing) return existing;

  const seed  = rollSeed();
  const nodes = generateStageMap(1, seed, MAP_WIDTH, MAP_HEIGHT);
  const totalChests = nodes.filter((n) => n.kind === "chest").length;

  const nodesMap: Record<string, (typeof nodes)[0]> = {};
  for (const n of nodes) {
    nodesMap[`${n.x},${n.y}`] = n;
  }

  const doc = await StageMapModel.create({
    playerId,
    stage:         1,
    seed,
    width:         MAP_WIDTH,
    height:        MAP_HEIGHT,
    nodes:         nodesMap,
    totalChests,
    clearedChests: 0,
  });

  return doc.toObject() as IStageMap;
}

// ---------------------------------------------------------------------------
// Node damage — server-authoritative
// ---------------------------------------------------------------------------

/**
 * Applies `dmg` damage to the node at (x, y).
 * If hp drops to 0, marks the node destroyed, increments clearedChests (for
 * chests only), and returns the coin reward.
 *
 * Returns null if no node exists at that position (already destroyed / wall).
 */
export async function damageNode(
  playerId: string,
  x: number,
  y: number,
  dmg = 1,
): Promise<{ destroyed: boolean; coins: number } | null> {
  await connectDatabase();
  const key = `${x},${y}`;

  // Read current hp.
  const map = await StageMapModel.findOne({ playerId }, { [`nodes.${key}`]: 1 }).lean<IStageMap>();
  const node = map?.nodes?.get ? map.nodes.get(key) : (map?.nodes as unknown as Record<string, { hp: number; coins: number; kind: string; destroyed: boolean }>)?.[key];

  if (!node || node.destroyed) return null;

  const newHp = Math.max(0, node.hp - dmg);

  if (newHp > 0) {
    // Just update hp.
    await StageMapModel.updateOne(
      { playerId },
      { $set: { [`nodes.${key}.hp`]: newHp } },
    );
    return { destroyed: false, coins: 0 };
  }

  // Node destroyed.
  const isChest = node.kind === "chest";
  const coins   = node.coins ?? 0;

  const updateOp: Record<string, unknown> = {
    $set: { [`nodes.${key}.hp`]: 0, [`nodes.${key}.destroyed`]: true },
  };
  if (isChest) {
    (updateOp as { $inc: Record<string, number> }).$inc = { clearedChests: 1 };
  }

  await StageMapModel.updateOne({ playerId }, updateOp);
  return { destroyed: true, coins };
}

// ---------------------------------------------------------------------------
// Stage completion — rewrites the layout in place
// ---------------------------------------------------------------------------

/**
 * Called when all chests are cleared. Rolls a new seed, regenerates nodes for
 * the next stage, resets counters, and $inc-rements the stage counter — all on
 * the SAME document (no new document inserted).
 */
export async function completeStage(playerId: string): Promise<IStageMap> {
  await connectDatabase();

  // Read current stage so we can advance it.
  const current = await StageMapModel.findOne({ playerId }, { stage: 1 }).lean<{ stage: number }>();
  const nextStage = (current?.stage ?? 1) + 1;

  const seed  = rollSeed();
  const nodes = generateStageMap(nextStage, seed, MAP_WIDTH, MAP_HEIGHT);
  const totalChests = nodes.filter((n) => n.kind === "chest").length;

  const nodesMap: Record<string, (typeof nodes)[0]> = {};
  for (const n of nodes) {
    nodesMap[`${n.x},${n.y}`] = n;
  }

  const updated = await StageMapModel.findOneAndUpdate(
    { playerId },
    {
      $inc: { stage: 1 },
      $set: {
        seed,
        width:         MAP_WIDTH,
        height:        MAP_HEIGHT,
        nodes:         nodesMap,
        totalChests,
        clearedChests: 0,
      },
    },
    { new: true, lean: true },
  );

  if (!updated) throw new Error(`No stage map found for playerId=${playerId}`);
  return updated as unknown as IStageMap;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** True when all chests have been cleared — the trigger for completeStage. */
export function isStageCleared(map: Pick<IStageMap, "clearedChests" | "totalChests">): boolean {
  return map.totalChests > 0 && map.clearedChests >= map.totalChests;
}
