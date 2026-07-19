import Decimal from "decimal.js-light";
import { GameState } from "@/features/types/gameplay/game";
import { ANIMALS_CONFIG } from "@/features/game/animals";
import { trackMilestone } from "@/features/game/milestones";
import { getSkillXP, getSkillLevel, computeDraw } from "@/features/game/skills";
import { rollDraw } from "@/features/game/draw";
import { INITIAL_DRAW } from "@/features/types/gameplay/skills";

export type CollectWoolAction = { type: "sheep.collectWool"; index: number };
type Options = { state: GameState; action: CollectWoolAction; createdAt?: number };

export function collectWool({ state, action, createdAt = Date.now() }: Options): GameState {
  const sheepCount = state.inventory.Sheep ?? 0;
  if (action.index < 0 || action.index >= Number(sheepCount)) throw new Error("Sheep does not exist");

  const sheep = state.sheep[action.index];
  if (!sheep?.fedAt) throw new Error("Sheep has not been fed");
  if (createdAt - sheep.fedAt < ANIMALS_CONFIG.Sheep.produceTimeMs) throw new Error("Wool is not ready yet");

  const draw       = state.draw ?? { ...INITIAL_DRAW };
  const woolAmount = rollDraw(draw.husbandryDraw);

  const currentWool    = state.inventory.Wool ?? new Decimal(0);
  const collectXP      = getSkillXP("collect_wool");
  const newHusbandryXP = (state.skills.husbandry ?? 0) + collectXP;
  const newSkills      = { ...state.skills, husbandry: newHusbandryXP };

  const oldLevel = getSkillLevel(state.skills.husbandry ?? 0);
  const newLevel = getSkillLevel(newHusbandryXP);
  const levelUp  = newLevel > oldLevel;

  const newDraw  = levelUp ? computeDraw(newSkills) : draw;

  return {
    ...state,
    inventory: { ...state.inventory, Wool: new Decimal(currentWool).add(woolAmount) },
    sheep:     { ...state.sheep, [action.index]: { fedAt: undefined } },
    milestones: trackMilestone(state.milestones, "Wool Collected", woolAmount),
    skills:    newSkills,
    draw:      newDraw,
  };
}
