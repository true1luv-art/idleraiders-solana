import type { PlayerSkills, SkillDraw } from "@/features/types/gameplay/skills";
import { getBaseDraw } from "@/features/game/draw";

const BASE_XP = 500;
const MAX_SKILL_LEVEL = 100;

export function xpForNextLevel(level: number): number {
  return Math.round(BASE_XP + 350 * (level - 1) + 25 * (level - 1) * (level - 1));
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForNextLevel(i);
  return total;
}

export function getSkillLevel(totalXP: number): number {
  let level = 1;
  let needed = 0;
  while (level < MAX_SKILL_LEVEL) {
    needed += xpForNextLevel(level);
    if (needed > totalXP) break;
    level++;
  }
  return level;
}

export const getSkillXPForLevel = totalXpForLevel;
/** Alias for xpForNextLevel — kept for farming.ts / farming.test.ts consumers. */
export const experienceForNextLevel = xpForNextLevel;

export function getSkillXPToNextLevel(totalXP: number): number {
  const level = getSkillLevel(totalXP);
  if (level >= MAX_SKILL_LEVEL) return 0;
  return xpForNextLevel(level) - (totalXP - totalXpForLevel(level));
}

export function getSkillProgress(totalXP: number): number {
  const level = getSkillLevel(totalXP);
  if (level >= MAX_SKILL_LEVEL) return 1;
  const levelStartXP = totalXpForLevel(level);
  return Math.min((totalXP - levelStartXP) / xpForNextLevel(level), 1);
}

export const SKILL_XP = {
  // Woodcutting
  chop_tree:              25,
  // Mining
  mine_stone:             60,
  mine_iron:             100,
  mine_gold:             150,
  // Farming — per crop
  harvest_potato:         10,
  harvest_carrot:         15,
  harvest_cabbage:        20,
  harvest_pumpkin:        25,
  harvest_beetroot:       35,
  harvest_parsnip:        45,
  harvest_radish:         55,
  harvest_cauliflower:    70,
  harvest_wheat:          90,
  harvest_kale:          120,
  // Husbandry
  collect_egg:            30,
  collect_milk:           50,
  collect_wool:           50,
  // Fishing — per species (ordered common → rare)
  catch_anchovy:          20,
  catch_sardine:          20,
  catch_tilapia:          25,
  catch_herring:          25,
  catch_trout:            35,
  catch_sea_bass:         40,
  catch_mackerel:         45,
  catch_salmon:           55,
  catch_red_snapper:      65,
  catch_barracuda:        80,
  catch_tuna:             95,
  catch_swordfish:       115,
  catch_blue_marlin:     140,
  catch_oarfish:         175,
} as const;

export type SkillXPAction = keyof typeof SKILL_XP;

export function getSkillXP(action: SkillXPAction): number {
  return SKILL_XP[action] ?? 0;
}

export function getHarvestXP(cropName: string): number {
  const key = `harvest_${cropName.toLowerCase()}` as SkillXPAction;
  return SKILL_XP[key] ?? 10;
}

export function getFishXP(fishName: string): number {
  const key = `catch_${fishName.toLowerCase().replace(/ /g, "_")}` as SkillXPAction;
  return SKILL_XP[key] ?? 20;
}

/**
 * Computes the base-draw value per skill from current skill XP.
 * Called on every level-up that crosses a draw threshold.
 */
export function computeDraw(skills: PlayerSkills): SkillDraw {
  return {
    farmingDraw:     getBaseDraw(getSkillLevel(skills.farming)),
    woodcuttingDraw: getBaseDraw(getSkillLevel(skills.woodcutting)),
    miningDraw:      getBaseDraw(getSkillLevel(skills.mining)),
    fishingDraw:     getBaseDraw(getSkillLevel(skills.fishing)),
    husbandryDraw:   getBaseDraw(getSkillLevel(skills.husbandry)),
  };
}
