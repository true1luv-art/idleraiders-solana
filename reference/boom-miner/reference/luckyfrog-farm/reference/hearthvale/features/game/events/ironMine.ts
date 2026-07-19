import Decimal from "decimal.js-light";
import { GameState, GameNode } from "../types/game";
import { getSkillXP, getSkillLevel, computeBonus } from "../lib/skills";
import { getOreYield, rollOreDouble } from "../lib/boosts";
import { hasEnoughStamina, deductStamina } from "../lib/stamina";
import { trackActivity } from "../lib/activity";
import { INITIAL_BONUS } from "../types/skills";

export type IronMineAction = {
  type: "iron.mined";
  index: number;
};

type Options = {
  state: GameState;
  action: IronMineAction;
  createdAt?: number;
};

// 12 hours
export const IRON_RECOVERY_TIME = 12 * 60 * 60;

export enum MINE_ERRORS {
  NO_ROCK       = "No rock",
  STILL_GROWING = "Rock is still recovering",
}

export function canMine(rock: GameNode, now: number = Date.now()) {
  return now - (rock.minedAt ?? 0) > IRON_RECOVERY_TIME * 1000;
}

export function mineIron({ state, action, createdAt = Date.now() }: Options): GameState {
  if (!hasEnoughStamina(state.stamina.current, "mine_iron")) {
    throw new Error("Not enough stamina to mine");
  }

  const rock = state.iron[action.index];
  if (!rock)                    throw new Error(MINE_ERRORS.NO_ROCK);
  if (!canMine(rock, createdAt)) throw new Error(MINE_ERRORS.STILL_GROWING);

  const bonus     = state.bonus ?? { ...INITIAL_BONUS };
  const baseYield = rock.amount ?? 2;
  const boosted   = getOreYield(baseYield, bonus);
  const isDouble  = rollOreDouble(bonus);
  const ironDrop  = isDouble ? boosted * 2 : boosted;

  const amount = new Decimal(state.inventory.Iron || 0);

  // Route XP to mining skill
  const mineXP      = getSkillXP("mine_iron");
  const newMiningXP = (state.skills.mining ?? 0) + mineXP;

  const oldLevel = getSkillLevel(state.skills.mining ?? 0);
  const newLevel = getSkillLevel(newMiningXP);
  const newBonus =
    newLevel > oldLevel && newLevel % 10 === 0
      ? computeBonus({ ...state.skills, mining: newMiningXP })
      : bonus;

  const activity = trackActivity(state.activity, "Iron Mined", 1);

  return {
    ...state,
    inventory: {
      ...state.inventory,
      Iron: amount.add(ironDrop),
    },
    iron: {
      ...state.iron,
      [action.index]: { name: "Iron" as const, minedAt: Date.now(), amount: 2 },
    },
    skills: { ...state.skills, mining: newMiningXP },
    bonus:  newBonus,
    stamina: {
      ...state.stamina,
      current: deductStamina(state.stamina.current, "mine_iron"),
    },
    activity,
  };
}
