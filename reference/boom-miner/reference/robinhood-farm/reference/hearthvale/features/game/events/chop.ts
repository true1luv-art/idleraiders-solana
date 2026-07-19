import Decimal from "decimal.js-light";
import { GameState, GameNode } from "../types/game";
import { getSkillXP, getSkillLevel, computeBonus } from "../lib/skills";
import { getWoodYield, rollWoodDouble } from "../lib/boosts";
import { hasEnoughStamina, deductStamina } from "../lib/stamina";
import { trackActivity } from "../lib/activity";
import { INITIAL_BONUS } from "../types/skills";

export enum CHOP_ERRORS {
  NO_TREE       = "No tree",
  STILL_GROWING = "Tree is still growing",
}

// 2 hours
export const TREE_RECOVERY_SECONDS = 2 * 60 * 60;

export function canChop(tree: GameNode, now: number = Date.now()) {
  return now - (tree.choppedAt ?? 0) > TREE_RECOVERY_SECONDS * 1000;
}

function getChoppedAt({ createdAt }: { createdAt: number }): number {
  return createdAt;
}

export type ChopAction = {
  type: "tree.chopped";
  index: number;
};

type Options = {
  state: GameState;
  action: ChopAction;
  createdAt?: number;
};

export function chop({ state, action, createdAt = Date.now() }: Options): GameState {
  if (!hasEnoughStamina(state.stamina.current, "chop_tree")) {
    throw new Error("Not enough stamina to chop");
  }

  const tree = state.trees[action.index];
  if (!tree)                      throw new Error(CHOP_ERRORS.NO_TREE);
  if (!canChop(tree, createdAt))  throw new Error(CHOP_ERRORS.STILL_GROWING);

  const bonus      = state.bonus ?? { ...INITIAL_BONUS };
  const baseYield  = tree.amount ?? 3;
  const boosted    = getWoodYield(baseYield, bonus);
  const isDouble   = rollWoodDouble(bonus);
  const woodDrop   = isDouble ? boosted * 2 : boosted;

  const woodAmount = new Decimal(state.inventory.Wood || 0);

  // Route XP to forestry skill
  const chopXP        = getSkillXP("chop_tree");
  const newForestryXP = (state.skills.forestry ?? 0) + chopXP;

  const oldLevel = getSkillLevel(state.skills.forestry ?? 0);
  const newLevel = getSkillLevel(newForestryXP);
  const newBonus =
    newLevel > oldLevel && newLevel % 10 === 0
      ? computeBonus({ ...state.skills, forestry: newForestryXP })
      : bonus;

  const activity = trackActivity(state.activity, "Tree Chopped", 1);

  return {
    ...state,
    inventory: {
      ...state.inventory,
      Wood: woodAmount.add(woodDrop),
    },
    trees: {
      ...state.trees,
      [action.index]: {
        name:      "Wood" as const,
        choppedAt: getChoppedAt({ createdAt }),
        amount:    3,
      },
    },
    skills: { ...state.skills, forestry: newForestryXP },
    bonus:  newBonus,
    stamina: {
      ...state.stamina,
      current: deductStamina(state.stamina.current, "chop_tree"),
    },
    activity,
  };
}
