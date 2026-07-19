import Decimal from "decimal.js-light";
import { GameState } from "../types/game";
import { ACHIEVEMENTS, AchievementName } from "../types/achievements";

export type ClaimAchievementAction = {
  type: "achievement.claimed";
  achievement: AchievementName;
};

type Options = {
  state: GameState;
  action: ClaimAchievementAction;
  createdAt?: number;
};

export function claimAchievement({ state, action, createdAt = Date.now() }: Options): GameState {
  const achievement = ACHIEVEMENTS[action.achievement];

  if (!achievement) {
    throw new Error("Achievement does not exist");
  }

  // Check if already claimed
  if (state.achievements?.[action.achievement]) {
    throw new Error("Achievement already claimed");
  }

  // Check prerequisites
  if (achievement.requires) {
    for (const req of achievement.requires) {
      if (!state.achievements?.[req]) {
        throw new Error(`Requires ${req} achievement first`);
      }
    }
  }

  // Check progress requirement
  const progress = achievement.progress(state);
  if (progress < achievement.requirement) {
    throw new Error("Requirement not met");
  }

  let newBalance    = state.balance;
  let newInventory  = { ...state.inventory };

  if (achievement.reward) {
    if (achievement.reward.coins) {
      newBalance = state.balance.add(achievement.reward.coins);
    }
    if (achievement.reward.items) {
      for (const item of achievement.reward.items) {
        const current = newInventory[item.name] || new Decimal(0);
        newInventory[item.name] = new Decimal(current).add(item.amount);
      }
    }
  }

  return {
    ...state,
    balance:   newBalance,
    inventory: newInventory,
    achievements: {
      ...state.achievements,
      [action.achievement]: createdAt,
    },
  };
}
