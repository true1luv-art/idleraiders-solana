import { describe, it, expect, vi, beforeEach } from "vitest";
import { completeQuest } from "./action";

vi.mock("@/lib/modules/inventories/model.server", () => ({
  InventoryModel: { updateOne: vi.fn().mockResolvedValue({}) },
}));

vi.mock("@/lib/modules/inventories/repository.server", () => ({
  getInventory: vi.fn(),
}));

vi.mock("@/lib/modules/players/model.server", () => ({
  PlayerModel: { findOneAndUpdate: vi.fn() },
}));

vi.mock("@/lib/modules/farms/repository.server", () => ({
  getFarm:             vi.fn(),
  completeQuestOnFarm: vi.fn(),
}));

vi.mock("@/lib/modules/game-stats/repository.server", () => ({
  incrementQuestsCompleted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/utils/reputation", () => ({
  getRank: vi.fn().mockReturnValue({ rank: "Villager" }),
}));

import { getFarm, completeQuestOnFarm } from "@/lib/modules/farms/repository.server";
import { getInventory }                  from "@/lib/modules/inventories/repository.server";
import { PlayerModel }                   from "@/lib/modules/players/model.server";

const PLAYER_ID = "0xplayer00000000000000000000000000000001";

const ACTIVE_QUEST = {
  id:         "q1",
  category:   "farming",
  difficulty: "easy" as const,
  status:     "active" as const,
  objective:  { resource: "Potato", required: 5 },
  rewards:    { rewardRep: 10, skillXp: 20 },
  generatedAt: Date.now() - 1000,
  expiresAt:   Date.now() + 86_400_000,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("completeQuest", () => {
  it("completes a quest and returns rewards", async () => {
    vi.mocked(getFarm).mockResolvedValue({ quests: { daily: [ACTIVE_QUEST] } } as never);
    vi.mocked(getInventory).mockResolvedValue({ items: { Potato: 10 } } as never);
    vi.mocked(PlayerModel.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ reputationPoints: 10 }),
    } as never);
    vi.mocked(completeQuestOnFarm).mockResolvedValue(true as never);

    const result = await completeQuest(PLAYER_ID, "q1");

    expect(result.rewardRep).toBe(10);
    expect(result.skillXp).toBe(20);
    expect(result.totalRep).toBe(10);
  });

  it("throws when farm is not found", async () => {
    vi.mocked(getFarm).mockResolvedValue(null as never);

    await expect(completeQuest(PLAYER_ID, "q1")).rejects.toThrow("Farm not found");
  });

  it("throws when quest id does not match any quest", async () => {
    vi.mocked(getFarm).mockResolvedValue({ quests: { daily: [ACTIVE_QUEST] } } as never);

    await expect(completeQuest(PLAYER_ID, "bad-id")).rejects.toThrow("Quest not found");
  });

  it("throws when quest is already completed", async () => {
    const done = { ...ACTIVE_QUEST, status: "completed" as const };
    vi.mocked(getFarm).mockResolvedValue({ quests: { daily: [done] } } as never);

    await expect(completeQuest(PLAYER_ID, "q1")).rejects.toThrow("completed");
  });

  it("throws when player has insufficient items", async () => {
    vi.mocked(getFarm).mockResolvedValue({ quests: { daily: [ACTIVE_QUEST] } } as never);
    vi.mocked(getInventory).mockResolvedValue({ items: { Potato: 2 } } as never);

    await expect(completeQuest(PLAYER_ID, "q1")).rejects.toThrow("Insufficient");
  });
});
