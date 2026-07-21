export interface Boss {
  id: string
  name: string
  tier: number
  energyCost: number
  damageMultiplier: number
  /** Player must have completed at least this many story quests before starting this boss raid. */
  requiredStoryProgress: number
  /** Guaranteed base coin reward — fed directly into calculateDungeonReward as baseReward. */
  baseTokenReward: number
}

export const BOSSES_DATA: Boss[] = [
  // ── Tier 1 — Evershade ──────────────────────────────────────────────────────
  {
    id: "b2",
    name: "Spider Queen",
    tier: 1,
    energyCost: 20,
    damageMultiplier: 1.0,
    requiredStoryProgress: 2,
    baseTokenReward: 800,
  },
  {
    id: "b1",
    name: "Goblin King",
    tier: 1,
    energyCost: 20,
    damageMultiplier: 1.0,
    requiredStoryProgress: 4,
    baseTokenReward: 800,
  },
  // ── Tier 2 — Sunspire ───────────────────────────────────────────────────────
  {
    id: "b3",
    name: "Soul Reaver",
    tier: 2,
    energyCost: 27,
    damageMultiplier: 1.25,
    requiredStoryProgress: 7,
    baseTokenReward: 2000,
  },
  {
    id: "b4",
    name: "Lich King",
    tier: 2,
    energyCost: 27,
    damageMultiplier: 1.25,
    requiredStoryProgress: 9,
    baseTokenReward: 2000,
  },
  // ── Tier 3 — Frosthold ──────────────────────────────────────────────────────
  {
    id: "b5",
    name: "Frost Giant",
    tier: 3,
    energyCost: 35,
    damageMultiplier: 1.5,
    requiredStoryProgress: 12,
    baseTokenReward: 4500,
  },
  {
    id: "b6",
    name: "Ancient Treant",
    tier: 3,
    energyCost: 35,
    damageMultiplier: 1.5,
    requiredStoryProgress: 14,
    baseTokenReward: 4500,
  },
  // ── Tier 4 — Ember City ─────────────────────────────────────────────────────
  {
    id: "b7",
    name: "Ember Colossus",
    tier: 4,
    energyCost: 42,
    damageMultiplier: 1.75,
    requiredStoryProgress: 17,
    baseTokenReward: 9000,
  },
  {
    id: "b8",
    name: "Ash Lord",
    tier: 4,
    energyCost: 42,
    damageMultiplier: 1.75,
    requiredStoryProgress: 19,
    baseTokenReward: 9000,
  },
  // ── Tier 5 — Iron Citadel ───────────────────────────────────────────────────
  {
    id: "b9",
    name: "Demon Lord",
    tier: 5,
    energyCost: 50,
    damageMultiplier: 2.0,
    requiredStoryProgress: 22,
    baseTokenReward: 18000,
  },
  {
    id: "b10",
    name: "Ancient Dragon",
    tier: 5,
    energyCost: 50,
    damageMultiplier: 2.0,
    requiredStoryProgress: 24,
    baseTokenReward: 18000,
  },
]

export default BOSSES_DATA
