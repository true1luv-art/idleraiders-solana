/**
 * Experience and Level Utilities
 * 
 * Based on Hearthvale progression system.
 * Uses a unified player level instead of separate farming/gathering levels.
 */

const BASE_LEVEL_EXPERIENCE = 500;

/**
 * Calculate XP required to advance from a given level to the next
 * Formula from Hearthvale: BASE + 350*(level-1) + 25*(level-1)²
 */
export function experienceForNextLevel(level: number): number {
  const linear = 350 * (level - 1);
  const quadratic = 25 * (level - 1) * (level - 1);
  return Math.round(BASE_LEVEL_EXPERIENCE + linear + quadratic);
}

/**
 * Calculate total XP required to reach a given level from level 1
 */
export function totalExperienceForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += experienceForNextLevel(i);
  }
  return total;
}

/**
 * Determine player level from total accumulated XP
 */
export function getLevelFromExperience(totalXP: number): number {
  let level = 1;
  let xpNeeded = 0;
  while (xpNeeded <= totalXP) {
    xpNeeded += experienceForNextLevel(level);
    if (xpNeeded <= totalXP) level++;
  }
  return level;
}

/**
 * Get current progress towards next level (0-1)
 */
export function getLevelProgress(totalXP: number): number {
  const currentLevel = getLevelFromExperience(totalXP);
  const currentLevelXP = totalExperienceForLevel(currentLevel);
  const nextLevelXP = experienceForNextLevel(currentLevel);
  const progressXP = totalXP - currentLevelXP;
  return Math.min(progressXP / nextLevelXP, 1);
}

/**
 * Get XP remaining to reach next level
 */
export function getXPToNextLevel(totalXP: number): number {
  const currentLevel = getLevelFromExperience(totalXP);
  const currentLevelXP = totalExperienceForLevel(currentLevel);
  const nextLevelXP = experienceForNextLevel(currentLevel);
  return nextLevelXP - (totalXP - currentLevelXP);
}

/**
 * XP rewards for various actions
 * Based on Hearthvale data
 */
export const XP_REWARDS = {
  // Resource gathering (from nodes.js)
  chop_tree: 25,
  mine_stone: 60,
  mine_iron: 100,
  mine_gold: 150,
  
  // Farming actions - XP per crop tier
  harvest_potato: 10,
  harvest_carrot: 15,
  harvest_cabbage: 20,
  harvest_pumpkin: 25,
  harvest_beetroot: 35,
  harvest_parsnip: 45,
  harvest_radish: 55,
  harvest_cauliflower: 70,
  harvest_wheat: 90,
  harvest_kale: 120,
  
  // Food crafting (from consumables.js)
  craft_roasted_potato: 25,
  craft_carrot_stew: 35,
  craft_cabbage_roll: 40,
  craft_pumpkin_soup: 50,
  craft_beetroot_salad: 60,
  craft_parsnip_porridge: 70,
  craft_radish_skewers: 80,
  craft_cauliflower_sandwich: 90,
  craft_wheat_bread: 100,
  craft_kale_stirfry: 120,
} as const;

export type XPAction = keyof typeof XP_REWARDS;

export function getXPForAction(action: XPAction): number {
  return XP_REWARDS[action] || 0;
}

/**
 * Get harvest XP for a specific crop
 */
export function getHarvestXP(cropName: string): number {
  const key = `harvest_${cropName.toLowerCase()}` as XPAction;
  return XP_REWARDS[key] || 10;
}

/**
 * Get craft XP for a specific food item
 */
export function getCraftXP(foodName: string): number {
  const normalized = foodName.toLowerCase().replace(/[- ]/g, '_');
  const key = `craft_${normalized}` as XPAction;
  return XP_REWARDS[key] || 0;
}

/**
 * Field (plot) level requirements
 * Based on Hearthvale farmscene.json map data
 * 
 * Plots unlock progressively as players level up:
 * - Plots 0-5: Level 0 (starter plots)
 * - Plots 6-8: Level 3
 * - Plots 9-11: Level 5
 * - Plots 12-14: Level 7
 * - Plots 15-17: Level 10
 * - Plots 18-20: Level 13
 * - Plots 21-23: Level 16
 * - Plots 24-26: Level 20
 * - Plots 27-29: Level 25
 */
export const FIELD_LEVEL_REQUIREMENTS: Record<number, number> = {
  // Starter plots (Level 0)
  0: 0,
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  // Level 3 plots
  6: 3,
  7: 3,
  8: 3,
  // Level 5 plots
  9: 5,
  10: 5,
  11: 5,
  // Level 7 plots
  12: 7,
  13: 7,
  14: 7,
  // Level 10 plots
  15: 10,
  16: 10,
  17: 10,
  // Level 13 plots
  18: 13,
  19: 13,
  20: 13,
  // Level 16 plots
  21: 16,
  22: 16,
  23: 16,
  // Level 20 plots
  24: 20,
  25: 20,
  26: 20,
  // Level 25 plots
  27: 25,
  28: 25,
  29: 25,
};

/**
 * Get level requirement for a specific field/plot index
 */
export function getFieldLevelRequirement(fieldIndex: number): number {
  return FIELD_LEVEL_REQUIREMENTS[fieldIndex] ?? 0;
}

/**
 * Check if a field is unlocked for the player's level
 */
export function isFieldUnlocked(fieldIndex: number, playerLevel: number): boolean {
  const requiredLevel = getFieldLevelRequirement(fieldIndex);
  return playerLevel >= requiredLevel;
}
