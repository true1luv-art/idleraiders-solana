import Decimal from "decimal.js-light";
import { GameState } from "../types/game";
import { getSkillXP, getSkillLevel, computeBonus } from "../lib/skills";
import { rollCatch } from "../lib/fishing";
import { hasEnoughStamina, deductStamina } from "../lib/stamina";
import { trackActivity } from "../lib/activity";
import { INITIAL_BONUS } from "../types/skills";
import {
  FISHING_BASE_COOLDOWN_MS,
  FISHING_MIN_COOLDOWN_MS,
} from "../lib/constants";

export type CatchFishAction = {
  type: "fish.caught";
  createdAt: number;
};

type Options = {
  state: GameState;
  action: CatchFishAction;
};

export function catchFish({ state, action }: Options): GameState {
  const { createdAt } = action;

  // 1. Stamina check
  if (!hasEnoughStamina(state.stamina.current, "fish_cast")) {
    throw new Error("Not enough stamina to fish");
  }

  // 2. Cooldown check — fishSpeed shortens the base cooldown down to the floor
  const fishSpeed = state.bonus.fishSpeed ?? 0;
  const effectiveCooldown = Math.max(
    FISHING_MIN_COOLDOWN_MS,
    FISHING_BASE_COOLDOWN_MS * (1 - fishSpeed)
  );
  if (createdAt - (state.fishing.lastCastAt ?? 0) < effectiveCooldown) {
    throw new Error("Fishing is on cooldown");
  }

  // 3. Weighted random draw — no tier multiplier, no rarity modifier
  const fishingXP    = state.skills.fishing ?? 0;
  const fishingLevel = getSkillLevel(fishingXP);
  const caught       = rollCatch(fishingLevel);

  // 4. Apply fishYield bonus and roll fishDouble
  const bonus  = state.bonus ?? { ...INITIAL_BONUS };
  let amount = Math.max(1, Math.floor(1 * (1 + (bonus.fishYield ?? 0))));
  if (Math.random() < (bonus.fishDouble ?? 0)) amount *= 2;

  // 5. Award XP; recompute bonus only when crossing a level-10 boundary
  const catchXP      = getSkillXP("catch_fish");
  const newFishingXP = fishingXP + catchXP;
  const oldLevel     = getSkillLevel(fishingXP);
  const newLevel     = getSkillLevel(newFishingXP);
  const newBonus     =
    newLevel > oldLevel && newLevel % 10 === 0
      ? computeBonus({ ...state.skills, fishing: newFishingXP })
      : bonus;

  // 6. Update inventory
  const current  = new Decimal(state.inventory[caught] ?? 0);
  const activity = trackActivity(state.activity, "Fish Caught", 1);

  return {
    ...state,
    inventory: {
      ...state.inventory,
      [caught]: current.add(amount),
    },
    skills: { ...state.skills, fishing: newFishingXP },
    bonus:  newBonus,
    stamina: {
      ...state.stamina,
      current: deductStamina(state.stamina.current, "fish_cast"),
    },
    fishing: {
      lastCastAt:       createdAt,
      lastCaughtFish:   caught,
      lastCaughtAmount: amount,
      totalCasts:       (state.fishing.totalCasts  ?? 0) + 1,
      totalCaught:      (state.fishing.totalCaught ?? 0) + 1,
    },
    activity,
  };
}
