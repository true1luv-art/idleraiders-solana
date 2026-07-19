/**
 * shared/game/quests.ts
 *
 * Quest system configuration.
 *
 * Design:
 *   1. Each category has a flat resource pool — every item the player can
 *      obtain in that skill. One is picked at random per quest.
 *   2. The required quantity is derived from the player's raw XP in that
 *      skill — no fixed per-difficulty table. More XP = more required.
 *   3. QuestDifficulty (easy/normal/hard/expert) is derived from the same
 *      XP and drives the reputation + skillXp reward only.
 *   4. No skill level gate — any resource can be requested at any level.
 *      Lower-XP players just get smaller quantities.
 */

import type { PlayerSkills } from "@/features/types/players";
import type { QuestCategory, QuestDifficulty, EmbeddedQuest } from "@/features/types/quests";

// ---------------------------------------------------------------------------
// Daily quest categories
// ---------------------------------------------------------------------------

export const DAILY_QUEST_CATEGORIES: readonly QuestCategory[] = [
  "farming",
  "mining",
  "woodcutting",
  "fishing",
  "husbandry",
] as const;

// ---------------------------------------------------------------------------
// Resource pools — every obtainable item per category
// ---------------------------------------------------------------------------

export const QUEST_RESOURCE_POOLS: Record<QuestCategory, readonly string[]> = {
  farming: [
    "Potato",
    "Carrot",
    "Cabbage",
    "Pumpkin",
    "Beetroot",
    "Parsnip",
    "Radish",
    "Cauliflower",
    "Wheat",
    "Kale",
  ],
  mining: [
    "Stone",
    "Iron",
    "Gold",
  ],
  woodcutting: [
    "Wood",
  ],
  fishing: [
    "Anchovy",
    "Sardine",
    "Tilapia",
    "Herring",
    "Trout",
    "Sea Bass",
    "Mackerel",
    "Salmon",
    "Red Snapper",
    "Barracuda",
    "Tuna",
    "Swordfish",
    "Blue Marlin",
    "Oarfish",
  ],
  husbandry: [
    "Egg",
    "Milk",
    "Wool",
  ],
};

// ---------------------------------------------------------------------------
// Required quantity — scales with raw skill XP, not level.
// XP bands:  0–499 | 500–4999 | 5000–24999 | 25000+
// These map to easy | normal | hard | expert difficulty tiers.
// Within each band the quantity is randomised ± 25% so two players at the
// same level get slightly different quests.
// ---------------------------------------------------------------------------

export interface QuestAmountBand {
  /** Upper bound of XP for this band (Infinity for the last band). */
  maxXp:    number;
  /** Midpoint quantity — final value is rolled ± 25% of this. */
  baseQty:  number;
  difficulty: QuestDifficulty;
  rewardRep:  number;
  skillXp:    number;
}

export const QUEST_AMOUNT_BANDS: QuestAmountBand[] = [
  { maxXp:    499, baseQty:  15, difficulty: "easy",   rewardRep:  50, skillXp:   50 },
  { maxXp:  4_999, baseQty:  35, difficulty: "normal", rewardRep: 100, skillXp:  150 },
  { maxXp: 24_999, baseQty:  80, difficulty: "hard",   rewardRep: 200, skillXp:  400 },
  { maxXp: Infinity, baseQty: 150, difficulty: "expert", rewardRep: 400, skillXp: 1000 },
];

/**
 * Resolve the amount band for a given raw skill XP total.
 */
export function bandForXp(xp: number): QuestAmountBand {
  return QUEST_AMOUNT_BANDS.find((b) => xp <= b.maxXp) ?? QUEST_AMOUNT_BANDS[QUEST_AMOUNT_BANDS.length - 1];
}

/**
 * Roll a required quantity for a given raw skill XP.
 * Result is baseQty ± 25%, rounded to the nearest integer, minimum 1.
 * Pass a seeded `rng` (returns 0–1) to make it deterministic in tests.
 */
export function rollRequired(xp: number, rng: () => number = Math.random): number {
  const { baseQty } = bandForXp(xp);
  // ± 25% variance: multiply by a value in [0.75, 1.25]
  const factor = 0.75 + rng() * 0.5;
  return Math.max(1, Math.round(baseQty * factor));
}

/**
 * Pick a random resource from the pool for a given category.
 * Pass a seeded `rng` to make it deterministic in tests.
 */
export function rollResource(
  category: QuestCategory,
  rng: () => number = Math.random,
): string {
  const pool = QUEST_RESOURCE_POOLS[category];
  return pool[Math.floor(rng() * pool.length)];
}

// ---------------------------------------------------------------------------
// Quest generation
// ---------------------------------------------------------------------------

function questId(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}

function tomorrowMidnightUTC(): number {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.getTime();
}

function skillXpForCategory(skills: PlayerSkills, category: QuestCategory): number {
  return skills[category as keyof PlayerSkills] ?? 0;
}

function buildEmbeddedQuest(
  category:  QuestCategory,
  xp:        number,
  expiresAt: number,
  now:       number,
): EmbeddedQuest {
  const band     = bandForXp(xp);
  const resource = rollResource(category);
  const required = rollRequired(xp);

  return {
    id:         questId(),
    category,
    difficulty: band.difficulty,
    status:     "active",
    objective:  { resource, required },
    rewards: {
      rewardRep: band.rewardRep,
      skillXp:   band.skillXp,
    },
    generatedAt: now,
    expiresAt,
  };
}

/**
 * Generate one daily quest per category, scaled to the player's current skill XP.
 */
export function generateDailyQuests(playerSkills: PlayerSkills): EmbeddedQuest[] {
  const expiresAt = tomorrowMidnightUTC();
  const now       = Date.now();

  return DAILY_QUEST_CATEGORIES.map((category) => {
    const xp = skillXpForCategory(playerSkills, category);
    return buildEmbeddedQuest(category, xp, expiresAt, now);
  });
}
