// ═══════════════════════════════════════════════════════════════════════════
// CARD CONFIGURATION — Types and Constants
// ═══════════════════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────────────────

export interface CardStats {
  raidPower: number
  mastery: number
  luck: number
  gm: number
}

export interface Card {
  id: string
  name: string
  description: string
  type: 'hero'
  class: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'special'
  supply?: number
  source?: 'heroes_pack' | 'event'
  spriteKey?: string
}

// ─── Base Stats Per Type ──────────────────────────────────────────────────

export const CARD_BASE_STATS: Record<string, CardStats> = {
  hero: { raidPower: 60, mastery: 30, luck: 0, gm: 1 },
}

// ─── Rarity Multipliers ───────────────────────────────────────────────────

export const RARITY_MULTIPLIERS: Record<string, number> = {
  common: 1,
  uncommon: 3,
  rare: 8,
  epic: 25,
  legendary: 100,
  special: 12,
}

// ─── GM Scaling By Rarity ─────────────────────────────────────────────────
// Common and Uncommon do not contribute GM (Guild Mastery)

export const GM_MULTIPLIER: Record<string, number> = {
  common: 0,
  uncommon: 0,
  rare: 1,
  epic: 3,
  legendary: 6,
  special: 2,
}

// ─── Hero Class Stat Modifiers ────────────────────────────────────────────
// 5 combat classes. Identity:
//   warrior  = high RaidPower, low Luck
//   archer   = balanced with Luck lean
//   mage     = high Mastery specialist
//   rogue    = extreme Luck spike
//   paladin  = balanced RaidPower + Mastery

export const HERO_CLASS_MODIFIERS: Record<string, Record<string, number>> = {
  warrior: { raidPower: 1.30, mastery: 0.80, luck: 0.70 },
  archer:  { raidPower: 1.05, mastery: 0.90, luck: 1.20 },
  mage:    { raidPower: 0.80, mastery: 1.50, luck: 0.80 },
  rogue:   { raidPower: 0.95, mastery: 0.75, luck: 1.60 },
  paladin: { raidPower: 1.15, mastery: 1.15, luck: 0.75 },
}
