import { Crop } from "../types/crops";
import { Inventory } from "../types/game";
import type { SkillBonus } from "../types/skills";

/**
 * How much VTC a crop is worth — no sell boost currently.
 */
export const getSellPrice = (crop: Crop, _inventory: Inventory) => crop.sellPrice;

export const hasSellBoost = (_inventory: Inventory) => false;

// ---------------------------------------------------------------------------
// Yield helpers — all read from state.bonus which is stored on GameState
// and recomputed by computeBonus() whenever a skill levels up.
// ---------------------------------------------------------------------------

/** Multiply a base yield by (1 + bonus). Returns a whole number (floor). */
function applyYield(base: number, bonusRate: number): number {
  return Math.floor(base * (1 + bonusRate));
}

// Forestry
export function getWoodYield(base: number, bonus: SkillBonus): number {
  return applyYield(base, bonus.woodYield);
}
export function getWoodRecoveryMultiplier(bonus: SkillBonus): number {
  return Math.max(0, 1 - bonus.woodRecovery);
}
export function rollWoodDouble(bonus: SkillBonus): boolean {
  return Math.random() < bonus.woodDouble;
}

// Mining
export function getOreYield(base: number, bonus: SkillBonus): number {
  return applyYield(base, bonus.oreYield);
}
export function getOreRecoveryMultiplier(bonus: SkillBonus): number {
  return Math.max(0, 1 - bonus.oreRecovery);
}
export function rollOreDouble(bonus: SkillBonus): boolean {
  return Math.random() < bonus.oreDouble;
}

// Farming
export function getCropYield(base: number, bonus: SkillBonus): number {
  return applyYield(base, bonus.cropYield);
}
export function getCropSpeedMultiplier(bonus: SkillBonus): number {
  return Math.max(0, 1 - bonus.cropSpeed);
}
export function rollCropDouble(bonus: SkillBonus): boolean {
  return Math.random() < bonus.cropDouble;
}

// Husbandry
export function getProduceYield(base: number, bonus: SkillBonus): number {
  return applyYield(base, bonus.produceYield);
}
export function getProduceSpeedMultiplier(bonus: SkillBonus): number {
  return Math.max(0, 1 - bonus.produceSpeed);
}
export function rollProduceDouble(bonus: SkillBonus): boolean {
  return Math.random() < bonus.produceDouble;
}

// Cooking
export function getStaminaYield(base: number, bonus: SkillBonus): number {
  return applyYield(base, bonus.staminaYield);
}
export function getCookingSpeedMultiplier(bonus: SkillBonus): number {
  return Math.max(0, 1 - bonus.cookingSpeed);
}
export function rollCookingDouble(bonus: SkillBonus): boolean {
  return Math.random() < bonus.cookingDouble;
}

// Combat — applied on top of baseStats via multipliers in computeStats
export function getDamageMultiplier(bonus: SkillBonus): number {
  return 1 + bonus.damageBonus;
}
export function getDefenseMultiplier(bonus: SkillBonus): number {
  return 1 + bonus.defenseBonus;
}
export function getDodgeMultiplier(bonus: SkillBonus): number {
  return 1 + bonus.dodgeBonus;
}
export function getCritChance(bonus: SkillBonus): number {
  return bonus.critChance;
}
