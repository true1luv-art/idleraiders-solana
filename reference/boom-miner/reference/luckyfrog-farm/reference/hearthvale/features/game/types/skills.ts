export type SkillCategory =
  | "farming"
  | "forestry"
  | "mining"
  | "fishing"
  | "cooking"
  | "combat"
  | "husbandry";

/**
 * Per-skill XP. Each skill levels independently using the shared XP curve.
 * Skills cap at level 100; the level is derived from the XP total via
 * getSkillLevel() in lib/skills.ts.
 */
export type PlayerSkills = Record<SkillCategory, number>;

export const INITIAL_SKILLS: PlayerSkills = {
  farming:   0,
  forestry:  0,
  mining:    0,
  fishing:   0,
  cooking:   0,
  combat:    0,
  husbandry: 0,
};

/**
 * All passive bonuses granted by skill levels.
 * Values are decimal multipliers or chance rates (e.g. 0.20 = 20%).
 * All fields are 0 at baseline and mutated when a skill reaches a
 * multiple of 10 (level 10, 20, 30 … 100).
 *
 * Pattern per resource skill: {skill}Yield / {skill}Recovery|Speed / {skill}Double
 * Combat uses % multipliers applied on top of baseStats.
 */
export type SkillBonus = {
  // Forestry
  woodYield:      number; // +% wood per chop
  woodRecovery:   number; // -% tree respawn time
  woodDouble:     number; // % chance double wood drop

  // Mining
  oreYield:       number; // +% ore per mine
  oreRecovery:    number; // -% rock respawn time
  oreDouble:      number; // % chance double ore drop

  // Farming
  cropYield:      number; // +% crops per harvest
  cropSpeed:      number; // -% crop grow time
  cropDouble:     number; // % chance double harvest

  // Husbandry
  produceYield:   number; // +% produce per collection
  produceSpeed:   number; // -% animal production time
  produceDouble:  number; // % chance double produce

  // Fishing (future)
  fishYield:      number; // +% fish per catch
  fishSpeed:      number; // -% time to get a bite
  fishDouble:     number; // % chance double catch

  // Cooking
  staminaYield:   number; // +% stamina restored from food
  cookingSpeed:   number; // -% cook time
  cookingDouble:  number; // % chance extra portion

  // Combat
  damageBonus:    number; // +% damage multiplier
  defenseBonus:   number; // +% defense multiplier
  dodgeBonus:     number; // +% dodge multiplier
  critChance:     number; // % crit chance
};

export const INITIAL_BONUS: SkillBonus = {
  woodYield:      0,
  woodRecovery:   0,
  woodDouble:     0,
  oreYield:       0,
  oreRecovery:    0,
  oreDouble:      0,
  cropYield:      0,
  cropSpeed:      0,
  cropDouble:     0,
  produceYield:  0,
  produceSpeed:  0,
  produceDouble: 0,
  fishYield:      0,
  fishSpeed:      0,
  fishDouble:     0,
  staminaYield:   0,
  cookingSpeed:   0,
  cookingDouble:  0,
  damageBonus:    0,
  defenseBonus:   0,
  dodgeBonus:     0,
  critChance:     0,
};
