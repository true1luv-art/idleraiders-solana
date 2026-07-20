// ═══════════════════════════════════════════════════════════════════════════
// CARD CONFIGURATION & STAT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
// Complete unified system for card stat generation and class modifiers

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

// ═══════════════════════════════════════════════════════════════════════════
// BASE STATS PER CARD TYPE
// ═══════════════════════════════════════════════════════════════════════════

export const CARD_BASE_STATS: Record<string, CardStats> = {
  hero: { raidPower: 60, mastery: 30, luck: 0, gm: 1 },
}

// ═══════════════════════════════════════════════════════════════════════════
// RARITY MULTIPLIERS (Apply to base stats)
// ═══════════════════════════════════════════════════════════════════════════

export const RARITY_MULTIPLIERS: Record<string, number> = {
  common: 1,
  uncommon: 3,
  rare: 8,
  epic: 25,
  legendary: 100,
  special: 12,
}

// ═══════════════════════════════════════════════════════════════════════════
// GM SCALING BY RARITY
// ═══════════════════════════════════════════════════════════════════════════
// Only rare and above cards contribute to GM (Guild Mastery)
// Common and Uncommon cards do not provide any GM bonus

export const GM_MULTIPLIER: Record<string, number> = {
  common: 0,
  uncommon: 0,
  rare: 1,
  epic: 3,
  legendary: 6,
  special: 2,
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASS-BASED STAT MODIFIERS
// ═══════════════════════════════════════════════════════════════════════════

// 5 combat classes only — blacksmith removed.
// Identity: warrior=frontline damage, mage=mastery, rogue=luck, archer=balanced luck, paladin=balanced raid+mastery
export const HERO_CLASS_MODIFIERS: Record<string, Record<string, number>> = {
  warrior: { raidPower: 1.30, mastery: 0.80, luck: 0.70 },
  archer:  { raidPower: 1.05, mastery: 0.90, luck: 1.20 },
  mage:    { raidPower: 0.80, mastery: 1.50, luck: 0.80 },
  rogue:   { raidPower: 0.95, mastery: 0.75, luck: 1.60 },
  paladin: { raidPower: 1.15, mastery: 1.15, luck: 0.75 },
}

// ═══════════════════════════════════════════════════════════════════════════
// STAT GENERATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates stats for any card type
 * @param type - Card type (hero, equipment, mount, transport, artifact, etc.)
 * @param rarity - Card rarity (common, uncommon, rare, epic, legendary, special)
 * @param cardClass - Optional class for stat modifiers (depends on card type)
 * @returns CardStats object with raidPower, mastery, luck, and gm values
 */
export function generateCardStats(type: string, rarity: string, cardClass?: string): CardStats {
  const base = CARD_BASE_STATS[type]
  const rarityMult = RARITY_MULTIPLIERS[rarity] || 1
  const gmScale = GM_MULTIPLIER[rarity] || 1

  if (!base) {
    return { raidPower: 0, mastery: 0, luck: 0, gm: 0 }
  }

  let raidPower = Math.round(base.raidPower * rarityMult)
  let mastery = Math.round(base.mastery * rarityMult)
  let luck = Math.round(base.luck * rarityMult)

  // Apply class modifiers (heroes only)
  if (cardClass && HERO_CLASS_MODIFIERS[cardClass]) {
    const mods = HERO_CLASS_MODIFIERS[cardClass]
    raidPower = Math.round(raidPower * mods.raidPower)
    mastery = Math.round(mastery * mods.mastery)
    luck = Math.round(luck * mods.luck)
  }

  return {
    raidPower,
    mastery,
    luck,
    gm: Math.round(base.gm * gmScale),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET CARD STATS FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get stats for any card
 * @param card - Card object with type, rarity, and optional class
 * @returns CardStats object
 */
export function getCardStats(card: Card): CardStats | null {
  return generateCardStats(card.type, card.rarity, card.class)
}

export default getCardStats
