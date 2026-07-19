import { GameState } from "../types/game";
import { CROPS } from "../types/crops";
import Decimal from "decimal.js-light";
import { screenTracker } from "lib/utils/screen";
import { getHarvestXP, getSkillLevel, computeBonus } from "../lib/skills";
import { getCropYield, rollCropDouble } from "../lib/boosts";
import { hasEnoughStamina, deductStamina } from "../lib/stamina";
import { trackActivity } from "../lib/activity";
import { ActivityName } from "../types/achievements";
import { INITIAL_BONUS } from "../types/skills";

export type HarvestAction = {
  type: "item.harvested";
  index: number;
};

type Options = {
  state: GameState;
  action: HarvestAction;
  createdAt?: number;
};

export function harvest({ state, action, createdAt = Date.now() }: Options) {
  if (!hasEnoughStamina(state.stamina.current, "harvest_crop")) {
    throw new Error("Not enough stamina to harvest");
  }

  const fields = { ...state.fields };

  if (action.index < 0)               throw new Error("Field does not exist");
  if (!Number.isInteger(action.index)) throw new Error("Field does not exist");
  if (action.index > 29)              throw new Error("Field does not exist");

  const field = fields[action.index];
  if (!field) throw new Error("Nothing was planted");

  const crop = CROPS()[field.name];
  if (createdAt - field.plantedAt < crop.harvestSeconds * 1000) throw new Error("Not ready");
  if (!screenTracker.calculate()) throw new Error("Invalid harvest");

  delete fields[action.index];

  const bonus      = state.bonus ?? { ...INITIAL_BONUS };
  const baseYield  = field.amount ?? 1;
  const boosted    = getCropYield(baseYield, bonus);
  const isDouble   = rollCropDouble(bonus);
  const yieldAmount = isDouble ? boosted * 2 : boosted;

  const cropCount = new Decimal(state.inventory[field.name] || 0);

  // Route XP to farming skill
  const harvestXP    = getHarvestXP(field.name);
  const newFarmingXP = (state.skills.farming ?? 0) + harvestXP;

  // Recompute bonus only if farming skill crossed a multiple-of-10 threshold
  const oldLevel = getSkillLevel(state.skills.farming ?? 0);
  const newLevel = getSkillLevel(newFarmingXP);
  const newBonus =
    newLevel > oldLevel && newLevel % 10 === 0
      ? computeBonus({ ...state.skills, farming: newFarmingXP })
      : bonus;

  let activity = trackActivity(state.activity, "Crop Harvested", 1);
  const cropActivityName = `${field.name} Harvested` as ActivityName;
  activity = trackActivity(activity, cropActivityName, 1);

  return {
    ...state,
    fields,
    inventory: {
      ...state.inventory,
      [field.name]: cropCount.add(yieldAmount),
    },
    skills: { ...state.skills, farming: newFarmingXP },
    bonus: newBonus,
    stamina: {
      ...state.stamina,
      current: deductStamina(state.stamina.current, "harvest_crop"),
    },
    activity,
  } as GameState;
}
