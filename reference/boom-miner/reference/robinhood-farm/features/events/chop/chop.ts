import Decimal from "decimal.js-light";
import { GameState, GameNode } from "@/features/types/gameplay/game";
import { getSkillXP, getSkillLevel, computeDraw } from "@/features/game/skills";
import { rollDraw } from "@/features/game/draw";

import { hasEnoughStamina, deductStamina } from "@/features/game/stamina";
import { trackMilestone } from "@/features/game/milestones";
import { INITIAL_DRAW } from "@/features/types/gameplay/skills";

export enum CHOP_ERRORS { NO_TREE = "No tree", STILL_GROWING = "Tree is still growing" }
export const TREE_RECOVERY_SECONDS = 15 * 60;

export function canChop(tree: GameNode, now: number = Date.now()): boolean {
  return now - (tree.choppedAt ?? 0) > TREE_RECOVERY_SECONDS * 1000;
}

export type ChopAction = { type: "tree.chopped"; index: number };
type Options = { state: GameState; action: ChopAction; createdAt?: number };

export function chop({ state, action, createdAt = Date.now() }: Options): GameState {
  if (!hasEnoughStamina(state.stamina.current, "chop_tree")) throw new Error("Not enough stamina to chop");

  const tree = state.trees[action.index];
  if (!tree)                     throw new Error(CHOP_ERRORS.NO_TREE);
  if (!canChop(tree, createdAt)) throw new Error(CHOP_ERRORS.STILL_GROWING);

  const draw      = state.draw ?? { ...INITIAL_DRAW };
  const woodDrop  = rollDraw(draw.woodcuttingDraw);

  const woodAmount        = new Decimal(state.inventory.Wood || 0);
  const newWoodcuttingXP  = (state.skills.woodcutting ?? 0) + getSkillXP("chop_tree");

  const oldLevel = getSkillLevel(state.skills.woodcutting ?? 0);
  const newLevel = getSkillLevel(newWoodcuttingXP);
  const levelUp  = newLevel > oldLevel;

  const newDraw  = levelUp ? computeDraw({ ...state.skills, woodcutting: newWoodcuttingXP }) : draw;

  return {
    ...state,
    inventory: { ...state.inventory, Wood: woodAmount.add(woodDrop) },
    trees: {
      ...state.trees,
      [action.index]: {
        name: "Wood" as const,
        choppedAt: createdAt,
      },
    },
    skills:    { ...state.skills, woodcutting: newWoodcuttingXP },
    draw:      newDraw,
    stamina:   { ...state.stamina, current: deductStamina(state.stamina.current, "chop_tree") },
    milestones: trackMilestone(state.milestones, "Tree Chopped", 1),
  };
}
