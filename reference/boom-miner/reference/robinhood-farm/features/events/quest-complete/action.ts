/**
 * lib/events/quest-complete/action.ts
 *
 * Quest completion handler. §fold-quests / §3.4-A
 *
 * Flow:
 *   1. Load the player's farm and look up the quest by id string.
 *   2. Validate: quest must exist, belong to this player, and be active.
 *   3. Validate inventory — player must have the full required quantity.
 *   4. Atomic ops:
 *        a. Deduct required resources from inventory.
 *        b. Increment skill XP for the quest's category.
 *        c. Award flat Reputation Points (rewardRep).
 *   5. Persist quest completion on the farm document.
 *
 * No rolls, no luck, no stat-based modifiers — rewards are flat and deterministic.
 */

import { InventoryModel }           from "@/lib/modules/inventories/model.server";
import { getInventory }             from "@/lib/modules/inventories/repository.server";
import { PlayerModel }              from "@/lib/modules/players/model.server";
import { getFarm }                  from "@/lib/modules/farms/repository.server";
import { completeQuestOnFarm }      from "@/lib/modules/farms/repository.server";
import { incrementQuestsCompleted } from "@/lib/modules/game-stats/repository.server";
import { getRank }                  from "@/features/utils/reputation";
import type { EmbeddedQuest }       from "@/features/types/quests";

// ---------------------------------------------------------------------------
// Error helper
// ---------------------------------------------------------------------------

class QuestError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 400) {
    super(message);
    this.code   = code;
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface QuestCompleteResult {
  quest:     EmbeddedQuest;
  rewardRep: number;
  skillXp:   number;
  totalRep:  number;
  newRank?:  string;
}

// ---------------------------------------------------------------------------
// completeQuest
// ---------------------------------------------------------------------------

export async function completeQuest(
  playerId: string,
  questId:  string,
): Promise<QuestCompleteResult> {

  // 1. Fetch farm and locate quest
  const farm = await getFarm(playerId);
  if (!farm) throw new QuestError("Farm not found.", "QUEST_NOT_FOUND", 404);

  const allEmbedded = (farm.quests?.daily ?? []) as EmbeddedQuest[];

  const quest = allEmbedded.find((q) => q.id === questId);
  if (!quest) throw new QuestError("Quest not found on this farm.", "QUEST_NOT_FOUND", 404);

  // 2. Validate status
  if (quest.status !== "active") {
    throw new QuestError(`Quest is ${quest.status} — cannot complete.`, "QUEST_NOT_ACTIVE", 409);
  }
  if (Date.now() > quest.expiresAt) {
    throw new QuestError("Quest has expired.", "QUEST_NOT_ACTIVE", 409);
  }

  // 3. Validate inventory
  const inventory = await getInventory(playerId);
  const held = (inventory?.items as Record<string, number> | undefined)?.[quest.objective.resource] ?? 0;
  if (held < quest.objective.required) {
    throw new QuestError(
      `Insufficient ${quest.objective.resource}. Need ${quest.objective.required}, have ${held}.`,
      "INSUFFICIENT_ITEMS",
    );
  }

  // 4a. Deduct required resource
  await InventoryModel.updateOne(
    { owner: playerId, item: quest.objective.resource },
    { $inc: { amount: -quest.objective.required } },
    { upsert: false },
  );

  // 4b. Award flat Reputation Points + Skill XP
  const rewardRep = quest.rewards.rewardRep ?? 0;
  const skillXp   = quest.rewards.skillXp   ?? 0;

  const updatedPlayer = await PlayerModel.findOneAndUpdate(
    { wallet: playerId },
    {
      $inc: {
        [`skills.${quest.category}`]: skillXp > 0 ? skillXp : 0,
        reputationPoints: rewardRep,
      },
    },
    { new: true },
  ).lean();

  const totalRep = updatedPlayer?.reputationPoints ?? rewardRep;

  // Detect rank-up
  const prevRep    = totalRep - rewardRep;
  const rankBefore = getRank(prevRep).rank;
  const rankAfter  = getRank(totalRep).rank;
  const newRank    = rankAfter !== rankBefore ? rankAfter : undefined;

  // 5. Persist completion on farm document
  const completed = await completeQuestOnFarm(playerId, questId);
  if (!completed) {
    throw new QuestError("Quest was already completed by a concurrent request.", "CONCURRENT_COMPLETE", 409);
  }

  // 6. Increment game-stats counter (fire-and-forget)
  incrementQuestsCompleted("daily").catch((err) => {
    console.error("[quest-complete] Failed to increment quest counter (non-fatal):", err);
  });

  return {
    quest,
    rewardRep,
    skillXp,
    totalRep,
    newRank,
  };
}
