import Decimal from "decimal.js-light";
import { GameState } from "@/features/types/gameplay/game";
import { getFishXP, getSkillLevel, computeDraw } from "@/features/game/skills";
import { rollCatch } from "@/features/game/fishing";
import { rollDraw } from "@/features/game/draw";
import { hasEnoughStamina, deductStamina } from "@/features/game/stamina";
import { trackMilestone } from "@/features/game/milestones";
import type { MilestoneName } from "@/features/types/gameplay/milestones";
import { INITIAL_DRAW } from "@/features/types/gameplay/skills";
import { FISHING_BASE_COOLDOWN_MS } from "@/features/game/fishing";

export type CatchFishAction = { type: "fish.caught"; createdAt: number };
type Options = { state: GameState; action: CatchFishAction };

export function catchFish({ state, action }: Options): GameState {
  const { createdAt } = action;

  if (!hasEnoughStamina(state.stamina.current, "fish_cast")) throw new Error("Not enough stamina to fish");

  if (createdAt - (state.fishing.lastCastAt ?? 0) < FISHING_BASE_COOLDOWN_MS) throw new Error("Fishing is on cooldown");

  const fishingXP    = state.skills.fishing ?? 0;
  const fishingLevel = getSkillLevel(fishingXP);
  const caught       = rollCatch(fishingLevel);

  const draw   = state.draw ?? { ...INITIAL_DRAW };
  const amount = rollDraw(draw.fishingDraw);

  const catchXP      = getFishXP(caught);
  const newFishingXP = fishingXP + catchXP;
  const oldLevel     = getSkillLevel(fishingXP);
  const newLevel     = getSkillLevel(newFishingXP);
  const levelUp      = newLevel > oldLevel;

  const newDraw  = levelUp ? computeDraw({ ...state.skills, fishing: newFishingXP }) : draw;

  const current = new Decimal(state.inventory[caught] ?? 0);

  return {
    ...state,
    inventory: { ...state.inventory, [caught]: current.add(amount) },
    skills:    { ...state.skills, fishing: newFishingXP },
    draw:      newDraw,
    stamina:   { ...state.stamina, current: deductStamina(state.stamina.current, "fish_cast") },
    fishing: {
      lastCastAt:     createdAt,
      lastCaughtFish: caught,
    },
    milestones: trackMilestone(
      trackMilestone(state.milestones, "Fish Caught", 1),
      `${caught} Caught` as MilestoneName,
      1,
    ),
  };
}
