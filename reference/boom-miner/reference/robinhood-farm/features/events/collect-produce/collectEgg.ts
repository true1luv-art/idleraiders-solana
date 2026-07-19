import Decimal from "decimal.js-light";
import { GameState } from "@/features/types/gameplay/game";
import { ANIMALS_CONFIG } from "@/features/game/animals";
import { trackMilestone } from "@/features/game/milestones";
import { getSkillXP, getSkillLevel, computeDraw } from "@/features/game/skills";
import { rollDraw } from "@/features/game/draw";
import { INITIAL_DRAW } from "@/features/types/gameplay/skills";

export type CollectEggAction = { type: "chicken.collectEgg"; index: number };
type Options = { state: GameState; action: CollectEggAction; createdAt?: number };

export function collectEgg({ state, action, createdAt = Date.now() }: Options): GameState {
  const chickenCount = state.inventory.Chicken ?? 0;
  if (action.index < 0 || action.index >= Number(chickenCount)) throw new Error("Chicken does not exist");

  const chicken = state.chickens[action.index];
  if (!chicken?.fedAt) throw new Error("Chicken has not been fed");
  if (createdAt - chicken.fedAt < ANIMALS_CONFIG.Chicken.produceTimeMs) throw new Error("Egg is not ready yet");

  const draw      = state.draw ?? { ...INITIAL_DRAW };
  const eggAmount = rollDraw(draw.husbandryDraw);

  const currentEggs    = state.inventory.Egg ?? new Decimal(0);
  const collectXP      = getSkillXP("collect_egg");
  const newHusbandryXP = (state.skills.husbandry ?? 0) + collectXP;
  const newSkills      = { ...state.skills, husbandry: newHusbandryXP };

  const oldLevel = getSkillLevel(state.skills.husbandry ?? 0);
  const newLevel = getSkillLevel(newHusbandryXP);
  const levelUp  = newLevel > oldLevel;

  const newDraw  = levelUp ? computeDraw(newSkills) : draw;

  return {
    ...state,
    inventory: { ...state.inventory, Egg: new Decimal(currentEggs).add(eggAmount) },
    chickens:  { ...state.chickens, [action.index]: { fedAt: undefined } },
    milestones: trackMilestone(state.milestones, "Egg Collected", eggAmount),
    skills:    newSkills,
    draw:      newDraw,
  };
}
