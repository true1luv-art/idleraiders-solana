import Decimal from "decimal.js-light";
import { GameState, Inventory } from "../types/game";
import { SHEEP_TIME_TO_WOOL } from "../lib/constants";
import { trackActivity } from "../lib/activity";
import { getSkillXP, computeBonus } from "../lib/skills";

export type CollectWoolAction = {
  type: "sheep.collectWool";
  index: number;
};

type Options = {
  state: GameState;
  action: CollectWoolAction;
  createdAt?: number;
};

export function collectWool({ state, action, createdAt = Date.now() }: Options): GameState {
  const sheepCount = state.inventory.Sheep ?? 0;
  
  if (action.index < 0 || action.index >= sheepCount) {
    throw new Error("Sheep does not exist");
  }

  const sheep = state.sheep[action.index];
  
  if (!sheep?.fedAt) {
    throw new Error("Sheep has not been fed");
  }

  const timePassedSinceFed = createdAt - sheep.fedAt;

  if (timePassedSinceFed < SHEEP_TIME_TO_WOOL) {
    throw new Error("Wool is not ready yet");
  }

  // Calculate wool amount — base multiplier scaled by produceYield bonus
  const baseAmount = sheep.multiplier || 1;
  const yieldMultiplier = 1 + (state.bonus.produceYield ?? 0);
  // Double-produce chance: roll once per collection
  const doubled = Math.random() < (state.bonus.produceDouble ?? 0);
  const woolAmount = Math.floor(baseAmount * yieldMultiplier) * (doubled ? 2 : 1);

  // Add wool to inventory
  const currentWool = state.inventory.Wool ?? new Decimal(0);
  const newInventory: Inventory = {
    ...state.inventory,
    Wool: new Decimal(currentWool).add(woolAmount),
  };

  // Reset sheep state (now hungry again)
  const newSheep = {
    ...state.sheep,
    [action.index]: {
      fedAt: undefined,
      multiplier: 1,
    },
  };

  // Track activity for achievements
  const activity = trackActivity(state.activity, "Wool Collected", woolAmount);

  // Award husbandry XP
  const collectXP = getSkillXP("collect_wool");
  const newHusbandryXP = (state.skills.husbandry ?? 0) + collectXP;
  const newSkills = { ...state.skills, husbandry: newHusbandryXP };
  const newBonus = computeBonus(newSkills);

  return {
    ...state,
    inventory: newInventory,
    sheep: newSheep,
    activity,
    skills: newSkills,
    bonus: newBonus,
  };
}
