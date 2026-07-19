import Decimal from "decimal.js-light";
import { GameState, GameNode } from "../types/game";
import { getSkillXP, getSkillLevel, computeBonus } from "../lib/skills";
import { getOreYield, rollOreDouble } from "../lib/boosts";
import { hasEnoughStamina, deductStamina } from "../lib/stamina";
import { trackActivity } from "../lib/activity";
import { INITIAL_BONUS } from "../types/skills";

export type GoldMineAction = {
  type: "gold.mined";
  index: number;
};

type Options = {
  state: GameState;
  action: GoldMineAction;
  createdAt?: number;
};

// 24 hours
export const GOLD_RECOVERY_TIME = 24 * 60 * 60;

export enum MINE_ERRORS {
  NO_ROCK       = "No rock",
  STILL_GROWING = "Rock is still recovering",
}

export function canMine(rock: GameNode, now: number = Date.now()) {
  return now - (rock.minedAt ?? 0) > GOLD_RECOVERY_TIME * 1000;
}

export function mineGold({ state, action, createdAt = Date.now() }: Options): GameState {
  if (!hasEnoughStamina(state.stamina.current, "mine_gold")) {
    throw new Error("Not enough stamina to mine");
  }

  const rock = state.gold[action.index];
  if (!rock)                    throw new Error(MINE_ERRORS.NO_ROCK);
  if (!canMine(rock, createdAt)) throw new Error(MINE_ERRORS.STILL_GROWING);

  const bonus     = state.bonus ?? { ...INITIAL_BONUS };
  const baseYield = rock.amount ?? 2;
  const boosted   = getOreYield(baseYield, bonus);
  const isDouble  = rollOreDouble(bonus);
  const goldDrop  = isDouble ? boosted * 2 : boosted;

  const amount = new Decimal(state.inventory.Gold || 0);

  // Route XP to mining skill
  const mineXP      = getSkillXP("mine_gold");
  const newMiningXP = (state.skills.mining ?? 0) + mineXP;

  const oldLevel = getSkillLevel(state.skills.mining ?? 0);
  const newLevel = getSkillLevel(newMiningXP);
  const newBonus =
    newLevel > oldLevel && newLevel % 10 === 0
      ? computeBonus({ ...state.skills, mining: newMiningXP })
      : bonus;

  const activity = trackActivity(state.activity, "Gold Mined", 1);

  return {
    ...state,
    inventory: {
      ...state.inventory,
      Gold: amount.add(goldDrop),
    },
    gold: {
      ...state.gold,
      [action.index]: { name: "Gold" as const, minedAt: Date.now(), amount: 2 },
    },
    skills: { ...state.skills, mining: newMiningXP },
    bonus:  newBonus,
    stamina: {
      ...state.stamina,
      current: deductStamina(state.stamina.current, "mine_gold"),
    },
    activity,
  };
}
