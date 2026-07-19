export type QuestCategory =
  | "farming"
  | "mining"
  | "woodcutting"
  | "fishing"
  | "husbandry";

export type QuestDifficulty = "easy" | "normal" | "hard" | "expert";
export type QuestStatus = "active" | "completed" | "expired";

/** A single quest embedded directly on the farm document. */
export interface EmbeddedQuest {
  id: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  status: QuestStatus;
  objective: { resource: string; required: number };
  rewards: {
    /** Flat Reputation Points awarded on completion. */
    rewardRep: number;
    skillXp: number;
  };
  generatedAt: number;
  expiresAt: number;
  completedAt?: number;
}

