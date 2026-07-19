import Decimal from "decimal.js-light";
import type { GameState, GameNode } from "@/features/types/gameplay/game";
import { getSkillLevel, getSkillXP, computeDraw } from "@/features/game/skills";
import { rollDraw } from "@/features/game/draw";

import { deductStamina, hasEnoughStamina } from "@/features/game/stamina";
import { trackMilestone } from "@/features/game/milestones";
import {
  GOLD_RECOVERY_SECONDS,
  IRON_RECOVERY_SECONDS,
  STONE_RECOVERY_SECONDS,
} from "@/features/game/resources";
import type { MilestoneName } from "@/features/types/gameplay/milestones";
import { INITIAL_DRAW } from "@/features/types/gameplay/skills";

export type MineAction =
  | { type: "stone.mined"; index: number }
  | { type: "iron.mined"; index: number }
  | { type: "gold.mined"; index: number };

type MineConfig = {
  collection: "stones" | "iron" | "gold";
  item: "Stone" | "Iron" | "Gold";
  stamina: "mine_stone" | "mine_iron" | "mine_gold";
  recoverySeconds: number;
  milestone: MilestoneName;
};

const CONFIG: Record<MineAction["type"], MineConfig> = {
  "stone.mined": { collection: "stones", item: "Stone", stamina: "mine_stone", recoverySeconds: STONE_RECOVERY_SECONDS, milestone: "Stone Mined" },
  "iron.mined":  { collection: "iron",   item: "Iron",  stamina: "mine_iron",  recoverySeconds: IRON_RECOVERY_SECONDS,  milestone: "Iron Mined"  },
  "gold.mined":  { collection: "gold",   item: "Gold",  stamina: "mine_gold",  recoverySeconds: GOLD_RECOVERY_SECONDS,  milestone: "Gold Mined"  },
};

export function mine(
  { state, action, createdAt = Date.now() }: {
    state: GameState;
    action: MineAction;
    createdAt?: number;
  },
): GameState {
  const config = CONFIG[action.type];
  if (!hasEnoughStamina(state.stamina.current, config.stamina)) throw new Error("Not enough stamina to mine");

  const nodes = state[config.collection] as Record<number, GameNode>;
  const rock = nodes[action.index];
  if (!rock) throw new Error("No rock");
  if (createdAt - (rock.minedAt ?? 0) <= config.recoverySeconds * 1000) throw new Error("Rock is still recovering");

  const draw    = state.draw ?? { ...INITIAL_DRAW };
  const drop    = rollDraw(draw.miningDraw);
  const current = new Decimal(state.inventory[config.item] ?? 0);

  const newMiningXP = state.skills.mining + getSkillXP(config.stamina);
  const oldLevel    = getSkillLevel(state.skills.mining);
  const newLevel    = getSkillLevel(newMiningXP);
  const levelUp     = newLevel > oldLevel;

  const newDraw  = levelUp ? computeDraw({ ...state.skills, mining: newMiningXP }) : draw;

  return {
    ...state,
    inventory: { ...state.inventory, [config.item]: current.add(drop) },
    [config.collection]: {
      ...nodes,
        [action.index]: {
        name: config.item,
        minedAt: createdAt,
      },
    },
    skills: { ...state.skills, mining: newMiningXP },
    draw:   newDraw,
    stamina: { ...state.stamina, current: deductStamina(state.stamina.current, config.stamina) },
    milestones: trackMilestone(state.milestones, config.milestone, 1),
  };
}
