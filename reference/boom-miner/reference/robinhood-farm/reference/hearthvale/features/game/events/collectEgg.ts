import Decimal from "decimal.js-light";
import { GameState, Inventory } from "../types/game";
import { CHICKEN_TIME_TO_EGG } from "../lib/constants";
import { trackActivity } from "../lib/activity";
import { getSkillXP } from "../lib/skills";
import { computeBonus } from "../lib/skills";

export type CollectEggAction = {
  type: "chicken.collectEgg";
  index: number;
};

type Options = {
  state: GameState;
  action: CollectEggAction;
  createdAt?: number;
};

export function collectEgg({ state, action, createdAt = Date.now() }: Options): GameState {
  const chickenCount = state.inventory.Chicken ?? 0;
  
  if (action.index < 0 || action.index >= chickenCount) {
    throw new Error("Chicken does not exist");
  }

  const chicken = state.chickens[action.index];
  
  if (!chicken?.fedAt) {
    throw new Error("Chicken has not been fed");
  }

  const timePassedSinceFed = createdAt - chicken.fedAt;

  if (timePassedSinceFed < CHICKEN_TIME_TO_EGG) {
    throw new Error("Egg is not ready yet");
  }

  // Calculate egg amount — base multiplier scaled by produceYield bonus
  const baseAmount = chicken.multiplier || 1;
  const yieldMultiplier = 1 + (state.bonus.produceYield ?? 0);
  // Double-produce chance: roll once per collection
  const doubled = Math.random() < (state.bonus.produceDouble ?? 0);
  const eggAmount = Math.floor(baseAmount * yieldMultiplier) * (doubled ? 2 : 1);

  // Add eggs to inventory
  const currentEggs = state.inventory.Egg ?? new Decimal(0);
  const newInventory: Inventory = {
    ...state.inventory,
    Egg: new Decimal(currentEggs).add(eggAmount),
  };

  // Reset chicken state (now hungry again)
  const newChickens = {
    ...state.chickens,
    [action.index]: {
      fedAt: undefined,
      multiplier: 1,
    },
  };

  // Track activity for achievements
  const activity = trackActivity(state.activity, "Egg Collected", eggAmount);

  // Award husbandry XP
  const collectXP = getSkillXP("collect_egg");
  const newHusbandryXP = (state.skills.husbandry ?? 0) + collectXP;
  const newSkills = { ...state.skills, husbandry: newHusbandryXP };
  const newBonus = computeBonus(newSkills);

  return {
    ...state,
    inventory: newInventory,
    chickens: newChickens,
    activity,
    skills: newSkills,
    bonus: newBonus,
  };
}
