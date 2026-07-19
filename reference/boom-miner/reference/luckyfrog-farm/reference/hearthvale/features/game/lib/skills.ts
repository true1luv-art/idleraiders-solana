/**
 * Skill system — XP curve, level derivation, and bonus computation.
 *
 * Skills use the same XP formula as the old player level (experience.ts)
 * so that the numbers feel familiar, but each skill caps at level 100.
 * Bonuses are stored on GameState.bonus and recomputed whenever a skill
 * crosses a multiple-of-10 threshold.
 */

import type { PlayerSkills, SkillBonus } from "../types/skills";
import { INITIAL_BONUS } from "../types/skills";

const BASE_XP = 500;
const MAX_SKILL_LEVEL = 100;

// ---------------------------------------------------------------------------
// XP curve
// ---------------------------------------------------------------------------

/** XP required to advance from `level` to `level + 1`. */
export function xpForNextLevel(level: number): number {
  const linear    = 350 * (level - 1);
  const quadratic = 25  * (level - 1) * (level - 1);
  return Math.round(BASE_XP + linear + quadratic);
}

/** Total accumulated XP needed to *reach* a given level (from level 1). */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpForNextLevel(i);
  }
  return total;
}

/** Derive the skill level (1–100) from total accumulated XP. */
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

/** Total XP required to reach `level` — alias for external consumers. */
export const getSkillXPForLevel = totalXpForLevel;

/** XP still needed from current XP total to reach the next level. */
export function getSkillXPToNextLevel(totalXP: number): number {
  const level      = getSkillLevel(totalXP);
  if (level >= MAX_SKILL_LEVEL) return 0;
  const levelStart = totalXpForLevel(level);
  return xpForNextLevel(level) - (totalXP - levelStart);
}

/** Progress toward the next level (0–1). */
export function getSkillProgress(totalXP: number): number {
  const level          = getSkillLevel(totalXP);
  if (level >= MAX_SKILL_LEVEL) return 1;
  const levelStartXP   = totalXpForLevel(level);
  const xpThisLevel    = totalXP - levelStartXP;
  const xpNeeded       = xpForNextLevel(level);
  return Math.min(xpThisLevel / xpNeeded, 1);
}

/** XP still needed to reach the next level. */
export function getXpToNextLevel(totalXP: number): number {
  const level       = getSkillLevel(totalXP);
  if (level >= MAX_SKILL_LEVEL) return 0;
  const levelStartXP = totalXpForLevel(level);
  return xpForNextLevel(level) - (totalXP - levelStartXP);
}

// ---------------------------------------------------------------------------
// XP rewards — one value per action, routed to the relevant skill category
// ---------------------------------------------------------------------------

export const SKILL_XP = {
  // Forestry
  chop_tree:                  25,

  // Mining
  mine_stone:                 60,
  mine_iron:                 100,
  mine_gold:                 150,

  // Farming
  harvest_potato:             10,
  harvest_carrot:             15,
  harvest_cabbage:            20,
  harvest_pumpkin:            25,
  harvest_beetroot:           35,
  harvest_parsnip:            45,
  harvest_radish:             55,
  harvest_cauliflower:        70,
  harvest_wheat:              90,
  harvest_kale:              120,

  // Cooking
  craft_roasted_potato:       25,
  craft_carrot_stew:          35,
  craft_cabbage_roll:         40,
  craft_pumpkin_soup:         50,
  craft_beetroot_salad:       60,
  craft_parsnip_porridge:     70,
  craft_radish_skewers:       80,
  craft_cauliflower_sandwich: 90,
  craft_wheat_bread:         100,
  craft_kale_stirfry:        120,

  // Husbandry
  collect_egg:                30,
  collect_milk:               50,
  collect_wool:               50,

  // Fishing
  catch_fish:                 35,
} as const;

export type SkillXPAction = keyof typeof SKILL_XP;

export function getSkillXP(action: SkillXPAction): number {
  return SKILL_XP[action] ?? 0;
}

/** Harvest XP for a named crop (falls back to 10). */
export function getHarvestXP(cropName: string): number {
  const key = `harvest_${cropName.toLowerCase()}` as SkillXPAction;
  return SKILL_XP[key] ?? 10;
}

/** Cook XP for a named food item (falls back to 0). */
export function getCookXP(foodName: string): number {
  const key = `craft_${foodName.toLowerCase().replace(/[\s-]/g, "_")}` as SkillXPAction;
  return SKILL_XP[key] ?? 0;
}

// ---------------------------------------------------------------------------
// Bonus tables — bonuses every 10 levels
// ---------------------------------------------------------------------------

/**
 * Compute the full SkillBonus from the current PlayerSkills XP values.
 * Called whenever a skill levels up; result is stored on GameState.bonus.
 */
export function computeBonus(skills: PlayerSkills): SkillBonus {
  const bonus = { ...INITIAL_BONUS };

  const forestry  = getSkillLevel(skills.forestry);
  const mining    = getSkillLevel(skills.mining);
  const farming   = getSkillLevel(skills.farming);
  const husbandry = getSkillLevel(skills.husbandry);
  const fishing   = getSkillLevel(skills.fishing);
  const cooking   = getSkillLevel(skills.cooking);
  const combat    = getSkillLevel(skills.combat);

  // -- Forestry (spec §7.1) --
  // Lv10 woodYield +0.10 | Lv20 +0.20 | Lv30 woodRecovery +0.10 | Lv40 woodYield +0.30
  // Lv50 woodRecovery +0.20 | Lv60 woodYield +0.40 | Lv70 woodRecovery +0.30
  // Lv80 woodYield +0.50 | Lv90 woodRecovery +0.40 | Lv100 woodYield +0.75, woodDouble +0.15
  if (forestry >= 10)  bonus.woodYield    += 0.10;
  if (forestry >= 20)  bonus.woodYield    += 0.10; // cumulative → 0.20
  if (forestry >= 30)  bonus.woodRecovery += 0.10;
  if (forestry >= 40)  bonus.woodYield    += 0.10; // cumulative → 0.30
  if (forestry >= 50)  bonus.woodRecovery += 0.10; // cumulative → 0.20
  if (forestry >= 60)  bonus.woodYield    += 0.10; // cumulative → 0.40
  if (forestry >= 70)  bonus.woodRecovery += 0.10; // cumulative → 0.30
  if (forestry >= 80)  bonus.woodYield    += 0.10; // cumulative → 0.50
  if (forestry >= 90)  bonus.woodRecovery += 0.10; // cumulative → 0.40
  if (forestry >= 100) { bonus.woodYield += 0.25; bonus.woodDouble += 0.15; } // yield → 0.75
  // max: woodYield 0.75, woodRecovery 0.40, woodDouble 0.15

  // -- Mining (spec §7.2) --
  // Lv10 oreYield +0.10 (Iron unlocked) | Lv20 +0.20 | Lv25 Gold unlocked (gate only)
  // Lv30 oreRecovery +0.10 | Lv40 oreYield +0.30 | Lv50 oreDouble +0.10
  // Lv60 oreRecovery +0.20 | Lv70 oreYield +0.50 | Lv80 oreRecovery +0.30
  // Lv90 oreDouble +0.20 | Lv100 oreYield +0.75, oreRecovery +0.40
  if (mining >= 10)  bonus.oreYield    += 0.10;
  if (mining >= 20)  bonus.oreYield    += 0.10; // cumulative → 0.20
  if (mining >= 30)  bonus.oreRecovery += 0.10;
  if (mining >= 40)  bonus.oreYield    += 0.10; // cumulative → 0.30
  if (mining >= 50)  bonus.oreDouble   += 0.10;
  if (mining >= 60)  bonus.oreRecovery += 0.10; // cumulative → 0.20
  if (mining >= 70)  bonus.oreYield    += 0.20; // cumulative → 0.50
  if (mining >= 80)  bonus.oreRecovery += 0.10; // cumulative → 0.30
  if (mining >= 90)  bonus.oreDouble   += 0.10; // cumulative → 0.20
  if (mining >= 100) { bonus.oreYield += 0.25; bonus.oreRecovery += 0.10; } // yield → 0.75, recovery → 0.40
  // max: oreYield 0.75, oreRecovery 0.40, oreDouble 0.20

  // -- Farming (spec §7.3) --
  // Lv10 cropSpeed +0.05 | Lv20 +0.10 | Lv30 cropYield +0.10 | Lv40 cropSpeed +0.15
  // Lv50 cropYield +0.20 | Lv60 cropSpeed +0.20 | Lv70 cropDouble +0.10
  // Lv80 cropYield +0.35 | Lv90 cropSpeed +0.25 | Lv100 cropYield +0.50, cropDouble +0.20
  if (farming >= 10)  bonus.cropSpeed  += 0.05;
  if (farming >= 20)  bonus.cropSpeed  += 0.05; // cumulative → 0.10
  if (farming >= 30)  bonus.cropYield  += 0.10;
  if (farming >= 40)  bonus.cropSpeed  += 0.05; // cumulative → 0.15
  if (farming >= 50)  bonus.cropYield  += 0.10; // cumulative → 0.20
  if (farming >= 60)  bonus.cropSpeed  += 0.05; // cumulative → 0.20
  if (farming >= 70)  bonus.cropDouble += 0.10;
  if (farming >= 80)  bonus.cropYield  += 0.15; // cumulative → 0.35
  if (farming >= 90)  bonus.cropSpeed  += 0.05; // cumulative → 0.25
  if (farming >= 100) { bonus.cropYield += 0.15; bonus.cropDouble += 0.10; } // yield → 0.50, double → 0.20
  // max: cropYield 0.50, cropSpeed 0.25, cropDouble 0.20

  // -- Husbandry (spec §7.5) --
  // Lv10 produceSpeed +0.10 | Lv20 +0.20 | Lv30 produceYield +0.10 | Lv40 produceSpeed +0.30
  // Lv50 produceDouble +0.10 | Lv60 produceYield +0.20 | Lv70 produceSpeed +0.40
  // Lv80 produceYield +0.30 | Lv90 produceDouble +0.20 | Lv100 produceSpeed +0.50, produceYield +0.50
  if (husbandry >= 10)  bonus.produceSpeed  += 0.10;
  if (husbandry >= 20)  bonus.produceSpeed  += 0.10; // cumulative → 0.20
  if (husbandry >= 30)  bonus.produceYield  += 0.10;
  if (husbandry >= 40)  bonus.produceSpeed  += 0.10; // cumulative → 0.30
  if (husbandry >= 50)  bonus.produceDouble += 0.10;
  if (husbandry >= 60)  bonus.produceYield  += 0.10; // cumulative → 0.20
  if (husbandry >= 70)  bonus.produceSpeed  += 0.10; // cumulative → 0.40
  if (husbandry >= 80)  bonus.produceYield  += 0.10; // cumulative → 0.30
  if (husbandry >= 90)  bonus.produceDouble += 0.10; // cumulative → 0.20
  if (husbandry >= 100) { bonus.produceSpeed += 0.10; bonus.produceYield += 0.20; } // speed → 0.50, yield → 0.50
  // max: produceYield 0.50, produceSpeed 0.50, produceDouble 0.20

  // -- Fishing (spec §7.6, next sprint) --
  // Lv10 fishYield +0.10 | Lv20 +0.20 | Lv30 fishSpeed +0.10 | Lv40 fishYield +0.30
  // Lv50 fishDouble +0.10 | Lv60 fishSpeed +0.20 | Lv70 fishYield +0.50
  // Lv80 fishSpeed +0.30 | Lv90 fishDouble +0.20 | Lv100 fishYield +0.75, fishDouble +0.15
  if (fishing >= 10)  bonus.fishYield  += 0.10;
  if (fishing >= 20)  bonus.fishYield  += 0.10; // cumulative → 0.20
  if (fishing >= 30)  bonus.fishSpeed  += 0.10;
  if (fishing >= 40)  bonus.fishYield  += 0.10; // cumulative → 0.30
  if (fishing >= 50)  bonus.fishDouble += 0.10;
  if (fishing >= 60)  bonus.fishSpeed  += 0.10; // cumulative → 0.20
  if (fishing >= 70)  bonus.fishYield  += 0.20; // cumulative → 0.50
  if (fishing >= 80)  bonus.fishSpeed  += 0.10; // cumulative → 0.30
  if (fishing >= 90)  bonus.fishDouble += 0.10; // cumulative → 0.20
  if (fishing >= 100) { bonus.fishYield += 0.25; bonus.fishDouble += 0.15; } // yield → 0.75, double → 0.35 (cap at 0.35 per spec)
  // max: fishYield 0.75, fishSpeed 0.30, fishDouble 0.35

  // -- Cooking (spec §7.4) --
  // Lv10 staminaYield +0.10 | Lv20 +0.20 | Lv30 cookingDouble +0.05 | Lv40 staminaYield +0.30
  // Lv50 cookingSpeed +0.10 | Lv60 cookingDouble +0.10 | Lv70 staminaYield +0.40
  // Lv80 cookingSpeed +0.20 | Lv90 cookingDouble +0.20 | Lv100 staminaYield +0.50, cookingSpeed +0.30
  if (cooking >= 10)  bonus.staminaYield  += 0.10;
  if (cooking >= 20)  bonus.staminaYield  += 0.10; // cumulative → 0.20
  if (cooking >= 30)  bonus.cookingDouble += 0.05;
  if (cooking >= 40)  bonus.staminaYield  += 0.10; // cumulative → 0.30
  if (cooking >= 50)  bonus.cookingSpeed  += 0.10;
  if (cooking >= 60)  bonus.cookingDouble += 0.05; // cumulative → 0.10
  if (cooking >= 70)  bonus.staminaYield  += 0.10; // cumulative → 0.40
  if (cooking >= 80)  bonus.cookingSpeed  += 0.10; // cumulative → 0.20
  if (cooking >= 90)  bonus.cookingDouble += 0.10; // cumulative → 0.20
  if (cooking >= 100) { bonus.staminaYield += 0.10; bonus.cookingSpeed += 0.10; } // staminaYield → 0.50, cookingSpeed → 0.30
  // max: staminaYield 0.50, cookingSpeed 0.30, cookingDouble 0.20

  // -- Combat (spec §7.7, future) --
  // Lv10 damageBonus +0.05 | Lv20 defenseBonus +0.05 | Lv30 dodgeBonus +0.05
  // Lv40 damageBonus +0.10 | Lv50 critChance +0.05 | Lv60 defenseBonus +0.10
  // Lv70 damageBonus +0.15 | Lv80 dodgeBonus +0.10 | Lv90 critChance +0.10
  // Lv100 damageBonus +0.20, critChance +0.15
  if (combat >= 10)  bonus.damageBonus  += 0.05;
  if (combat >= 20)  bonus.defenseBonus += 0.05;
  if (combat >= 30)  bonus.dodgeBonus   += 0.05;
  if (combat >= 40)  bonus.damageBonus  += 0.05; // cumulative → 0.10
  if (combat >= 50)  bonus.critChance   += 0.05;
  if (combat >= 60)  bonus.defenseBonus += 0.05; // cumulative → 0.10
  if (combat >= 70)  bonus.damageBonus  += 0.05; // cumulative → 0.15
  if (combat >= 80)  bonus.dodgeBonus   += 0.05; // cumulative → 0.10
  if (combat >= 90)  bonus.critChance   += 0.05; // cumulative → 0.10
  if (combat >= 100) { bonus.damageBonus += 0.05; bonus.critChance += 0.05; } // damage → 0.20, crit → 0.15
  // max: damageBonus 0.20, defenseBonus 0.10, dodgeBonus 0.10, critChance 0.15

  return bonus;
}
