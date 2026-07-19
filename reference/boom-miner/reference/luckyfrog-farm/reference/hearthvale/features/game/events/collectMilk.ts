import Decimal from "decimal.js-light";
import { GameState, Inventory } from "../types/game";
import { COW_TIME_TO_MILK } from "../lib/constants";
import { trackActivity } from "../lib/activity";
import { getSkillXP, computeBonus } from "../lib/skills";

export type CollectMilkAction = {
  type: "cow.collectMilk";
  index: number;
};

type Options = {
  state: GameState;
  action: CollectMilkAction;
  createdAt?: number;
};

export function collectMilk({ state, action, createdAt = Date.now() }: Options): GameState {
  const cowCount = state.inventory.Cow ?? 0;
  
  if (action.index < 0 || action.index >= cowCount) {
    throw new Error("Cow does not exist");
  }

  const cow = state.cows[action.index];
  
  if (!cow?.fedAt) {
    throw new Error("Cow has not been fed");
  }

  const timePassedSinceFed = createdAt - cow.fedAt;

  if (timePassedSinceFed < COW_TIME_TO_MILK) {
    throw new Error("Milk is not ready yet");
  }

  // Calculate milk amount — base multiplier scaled by produceYield bonus
  const baseAmount = cow.multiplier || 1;
  const yieldMultiplier = 1 + (state.bonus.produceYield ?? 0);
  // Double-produce chance: roll once per collection
  const doubled = Math.random() < (state.bonus.produceDouble ?? 0);
  const milkAmount = Math.floor(baseAmount * yieldMultiplier) * (doubled ? 2 : 1);

  // Add milk to inventory
  const currentMilk = state.inventory.Milk ?? new Decimal(0);
  const newInventory: Inventory = {
    ...state.inventory,
    Milk: new Decimal(currentMilk).add(milkAmount),
  };

  // Reset cow state (now hungry again)
  const newCows = {
    ...state.cows,
    [action.index]: {
      fedAt: undefined,
      multiplier: 1,
    },
  };

  // Track activity for achievements
  const activity = trackActivity(state.activity, "Milk Collected", milkAmount);

  // Award husbandry XP
  const collectXP = getSkillXP("collect_milk");
  const newHusbandryXP = (state.skills.husbandry ?? 0) + collectXP;
  const newSkills = { ...state.skills, husbandry: newHusbandryXP };
  const newBonus = computeBonus(newSkills);

  return {
    ...state,
    inventory: newInventory,
    cows: newCows,
    activity,
    skills: newSkills,
    bonus: newBonus,
  };
}
