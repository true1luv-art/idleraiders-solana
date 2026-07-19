/**
 * Stamina System Utilities
 *
 * Based on Hearthvale energy design. Stamina acts as a resource limiter
 * for farming and gathering actions, encouraging strategic gameplay.
 */

// Stamina system constants (based on Hearthvale)
export const STAMINA_CONSTANTS = {
  DEFAULT_MAX_STAMINA: 100,
  REGEN_INTERVAL_MS: 60 * 60 * 1000, // 1 hour between regen ticks
  STAMINA_REGEN_PERCENT: 0.05, // 5% of max stamina per hour
  MAX_OFFLINE_REGEN_INTERVALS: 8, // Cap at 8 hours offline regen
};

// Stamina costs per action
export const STAMINA_COSTS = {
  harvest_crop: 1,
  harvest_resource: 1,
  chop_tree: 1,
  mine_stone: 1,
  mine_iron: 1,
  mine_gold: 1,
  plant: 0,     // Free to plant
  fish_cast: 3, // Costs 3 stamina per cast
} as const;

export type StaminaAction = keyof typeof STAMINA_COSTS;

/**
 * Calculate passive stamina regeneration based on time elapsed
 */
export function calculateStaminaRegen(
  lastRegenAt: number,
  currentStamina: number,
  maxStamina: number
): { newStamina: number; intervalsElapsed: number; newRegenAt: number } {
  const now = Date.now();
  const timeSinceLastRegen = now - lastRegenAt;
  const intervalsElapsed = Math.floor(
    timeSinceLastRegen / STAMINA_CONSTANTS.REGEN_INTERVAL_MS
  );

  if (intervalsElapsed === 0) {
    return {
      newStamina: currentStamina,
      intervalsElapsed: 0,
      newRegenAt: lastRegenAt,
    };
  }

  const cappedIntervals = Math.min(
    intervalsElapsed,
    STAMINA_CONSTANTS.MAX_OFFLINE_REGEN_INTERVALS
  );
  const regenAmount = Math.ceil(
    maxStamina * STAMINA_CONSTANTS.STAMINA_REGEN_PERCENT * cappedIntervals
  );
  const newStamina = Math.min(currentStamina + regenAmount, maxStamina);

  // Move regen timestamp forward by the number of intervals processed
  const newRegenAt =
    lastRegenAt + cappedIntervals * STAMINA_CONSTANTS.REGEN_INTERVAL_MS;

  return { newStamina, intervalsElapsed: cappedIntervals, newRegenAt };
}

/**
 * Check if player has enough stamina for an action
 */
export function hasEnoughStamina(
  current: number,
  action: StaminaAction
): boolean {
  return current >= STAMINA_COSTS[action];
}

/**
 * Deduct stamina for an action
 */
export function deductStamina(current: number, action: StaminaAction): number {
  return Math.max(0, current - STAMINA_COSTS[action]);
}

/**
 * Get stamina cost for an action
 */
export function getStaminaCost(action: StaminaAction): number {
  return STAMINA_COSTS[action];
}

/**
 * Get max stamina for a player level
 * Base 100 stamina, no level scaling for now
 */
export function getMaxStaminaForLevel(_level: number): number {
  // Simple implementation - can add level scaling later if needed
  return STAMINA_CONSTANTS.DEFAULT_MAX_STAMINA;
}

/**
 * Get time until next stamina regen tick in milliseconds
 */
export function getTimeUntilNextRegen(lastRegenAt: number): number {
  const now = Date.now();
  const timeSinceLastRegen = now - lastRegenAt;
  const timeUntilNextRegen =
    STAMINA_CONSTANTS.REGEN_INTERVAL_MS -
    (timeSinceLastRegen % STAMINA_CONSTANTS.REGEN_INTERVAL_MS);
  return timeUntilNextRegen;
}

/**
 * Format time remaining until next regen
 */
export function formatRegenTime(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}
