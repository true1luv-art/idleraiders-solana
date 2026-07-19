import Decimal from "decimal.js-light";
import { GameState } from "@/features/types/gameplay/game";
import { CROPS } from "@/features/types/gameplay/crops";
import { screenTracker } from "@/features/utils/screen";
import { getHarvestXP, getSkillLevel, computeDraw } from "@/features/game/skills";
import { rollDraw } from "@/features/game/draw";
import { hasEnoughStamina, deductStamina } from "@/features/game/stamina";
import { trackMilestone } from "@/features/game/milestones";
import { MilestoneName } from "@/features/types/gameplay/milestones";
import { INITIAL_DRAW } from "@/features/types/gameplay/skills";

export type HarvestAction = { type: "item.harvested"; index: number };
type Options = { state: GameState; action: HarvestAction; createdAt?: number };

export function harvest({ state, action, createdAt = Date.now() }: Options): GameState {
  if (!hasEnoughStamina(state.stamina.current, "harvest_crop")) throw new Error("Not enough stamina to harvest");

  const fields = { ...state.fields };
  if (action.index < 0 || !Number.isInteger(action.index) || action.index > 29) throw new Error("Field does not exist");

  const field = fields[action.index];
  if (!field) throw new Error("Nothing was planted");

  const crops    = CROPS();
  const cropName = field.name as keyof typeof crops;
  const crop     = crops[cropName];
  if (!crop) throw new Error("Not a crop field");
  if (createdAt - (field.plantedAt ?? 0) < crop.harvestSeconds * 1000) throw new Error("Not ready");
  if (!screenTracker.calculate()) throw new Error("Invalid harvest");

  delete fields[action.index];

  const draw       = state.draw ?? { ...INITIAL_DRAW };
  const yieldAmount = rollDraw(draw.farmingDraw);

  const cropCount    = new Decimal(state.inventory[field.name] || 0);
  const harvestXP    = getHarvestXP(field.name);
  const newFarmingXP = (state.skills.farming ?? 0) + harvestXP;

  const oldLevel = getSkillLevel(state.skills.farming ?? 0);
  const newLevel = getSkillLevel(newFarmingXP);
  const levelUp  = newLevel > oldLevel;

  const newDraw  = levelUp ? computeDraw({ ...state.skills, farming: newFarmingXP }) : draw;

  let milestones = trackMilestone(state.milestones, "Crop Harvested", 1);
  milestones = trackMilestone(milestones, `${field.name} Harvested` as MilestoneName, 1);

  return {
    ...state,
    fields,
    inventory:  { ...state.inventory, [field.name]: cropCount.add(yieldAmount) },
    skills:     { ...state.skills, farming: newFarmingXP },
    draw:       newDraw,
    stamina:    { ...state.stamina, current: deductStamina(state.stamina.current, "harvest_crop") },
    milestones,
  } as GameState;
}
