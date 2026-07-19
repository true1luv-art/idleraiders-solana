export type SkillCategory =
  | "farming"
  | "woodcutting"
  | "mining"
  | "fishing"
  | "husbandry";

export type PlayerSkills = Record<SkillCategory, number>;

export const INITIAL_SKILLS: PlayerSkills = {
  farming:     0,
  woodcutting: 0,
  mining:      0,
  fishing:     0,
  husbandry:   0,
};

// ---------------------------------------------------------------------------
// Draw system — replaces the old yield / double-drop bonuses
// ---------------------------------------------------------------------------

/**
 * The resolved base-draw value per skill. Derived once per level-up from
 * getBaseDraw() in shared/game/draw.ts and cached on GameState.
 */
export type SkillDraw = {
  farmingDraw:     number;  // 1–12
  woodcuttingDraw: number;  // 1–12
  miningDraw:      number;  // 1–12
  fishingDraw:     number;  // 1–12
  husbandryDraw:   number;  // 1–12
};

export const INITIAL_DRAW: SkillDraw = {
  farmingDraw:     1,
  woodcuttingDraw: 1,
  miningDraw:      1,
  fishingDraw:     1,
  husbandryDraw:   1,
};
