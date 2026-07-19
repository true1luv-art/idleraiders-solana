/**
 * Shared game constants — safe to import from both server routes and
 * 'use client' modules. No React, no Zustand, no browser globals.
 */

/** $BMCOIN cost per minted hero. */
export const MINT_COST = 500_000;

/** Maximum number of heroes a player can have on the map at once. */
export const MAX_ON_MAP = 10;

/** Energy points per 1 Stamina attribute point. */
export const ENERGY_PER_STAMINA = 100;

/** Fraction of max energy recovered per regen interval. */
export const RECOVERY_FRACTION_PER_INTERVAL = 0.1;

/** Regen interval in seconds. */
export const RECOVERY_INTERVAL_SECONDS = 5 * 60;

export function maxEnergyFor(stamina: number): number {
  return stamina * ENERGY_PER_STAMINA;
}
