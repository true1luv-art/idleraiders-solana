import Decimal from "decimal.js-light";
import { GameState } from "@/features/types/gameplay/game";
import { ANIMALS_CONFIG } from "@/features/game/animals";
import { trackMilestone } from "@/features/game/milestones";
import { getSkillXP, getSkillLevel, computeDraw } from "@/features/game/skills";
import { rollDraw } from "@/features/game/draw";
import { INITIAL_DRAW } from "@/features/types/gameplay/skills";

export type CollectMilkAction = { type: "cow.collectMilk"; index: number };
type Options = { state: GameState; action: CollectMilkAction; createdAt?: number };

export function collectMilk({ state, action, createdAt = Date.now() }: Options): GameState {
  const cowCount = state.inventory.Cow ?? 0;
  if (action.index < 0 || action.index >= Number(cowCount)) throw new Error("Cow does not exist");

  const cow = state.cows[action.index];
  if (!cow?.fedAt) throw new Error("Cow has not been fed");
  if (createdAt - cow.fedAt < ANIMALS_CONFIG.Cow.produceTimeMs) throw new Error("Milk is not ready yet");

  const draw       = state.draw ?? { ...INITIAL_DRAW };
  const milkAmount = rollDraw(draw.husbandryDraw);

  const currentMilk    = state.inventory.Milk ?? new Decimal(0);
  const collectXP      = getSkillXP("collect_milk");
  const newHusbandryXP = (state.skills.husbandry ?? 0) + collectXP;
  const newSkills      = { ...state.skills, husbandry: newHusbandryXP };

  const oldLevel = getSkillLevel(state.skills.husbandry ?? 0);
  const newLevel = getSkillLevel(newHusbandryXP);
  const levelUp  = newLevel > oldLevel;

  const newDraw  = levelUp ? computeDraw(newSkills) : draw;

  return {
    ...state,
    inventory: { ...state.inventory, Milk: new Decimal(currentMilk).add(milkAmount) },
    cows:      { ...state.cows, [action.index]: { fedAt: undefined } },
    milestones: trackMilestone(state.milestones, "Milk Collected", milkAmount),
    skills:    newSkills,
    draw:      newDraw,
  };
}
