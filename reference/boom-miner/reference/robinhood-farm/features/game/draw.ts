/**
 * shared/game/draw.ts
 *
 * Base-draw mechanic. All five gathering skills (Farming, Woodcutting, Mining,
 * Fishing, Husbandry) share the same level → draw table. On every qualifying
 * action the game rolls a number between 1 and baseDraw (inclusive); that is
 * the unit count added to inventory.
 *
 * Reference: docs/SKILL_DRAW_SYSTEM_PROPOSAL.md
 */

/**
 * Returns the base draw for a given skill level.
 *
 * | Level Range | Base Draw |
 * |---|---|
 * | 1–9  | 1  |
 * | 10–19 | 2  |
 * | 20–34 | 3  |
 * | 35–49 | 4  |
 * | 50–69 | 6  |
 * | 70–89 | 8  |
 * | 90–99 | 10 |
 * | 100   | 12 |
 */
export function getBaseDraw(level: number): number {
  if (level >= 100) return 12;
  if (level >= 90)  return 10;
  if (level >= 70)  return 8;
  if (level >= 50)  return 6;
  if (level >= 35)  return 4;
  if (level >= 20)  return 3;
  if (level >= 10)  return 2;
  return 1;
}

/**
 * Rolls a yield value between 1 and baseDraw (inclusive).
 * Pass a multiplier (e.g. treeBaseAmount) to scale the result.
 */
export function rollDraw(baseDraw: number, multiplier = 1): number {
  return (Math.floor(Math.random() * baseDraw) + 1) * multiplier;
}
