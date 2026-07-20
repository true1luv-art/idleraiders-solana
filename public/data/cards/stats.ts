// ═══════════════════════════════════════════════════════════════════════════
// CARD STAT GENERATION — Pure functions
// ═══════════════════════════════════════════════════════════════════════════

import {
  type Card,
  type CardStats,
  CARD_BASE_STATS,
  RARITY_MULTIPLIERS,
  GM_MULTIPLIER,
  HERO_CLASS_MODIFIERS,
} from './config'

/**
 * Generates final stats for a card given its type, rarity, and optional class.
 * Returns zeroed stats if the type has no base definition.
 */
export function generateCardStats(type: string, rarity: string, cardClass?: string): CardStats {
  const base = CARD_BASE_STATS[type]
  const rarityMult = RARITY_MULTIPLIERS[rarity] ?? 1
  const gmScale = GM_MULTIPLIER[rarity] ?? 0

  if (!base) return { raidPower: 0, mastery: 0, luck: 0, gm: 0 }

  let raidPower = Math.round(base.raidPower * rarityMult)
  let mastery   = Math.round(base.mastery   * rarityMult)
  let luck      = Math.round(base.luck      * rarityMult)

  if (cardClass && HERO_CLASS_MODIFIERS[cardClass]) {
    const mods = HERO_CLASS_MODIFIERS[cardClass]
    raidPower = Math.round(raidPower * mods.raidPower)
    mastery   = Math.round(mastery   * mods.mastery)
    luck      = Math.round(luck      * mods.luck)
  }

  return {
    raidPower,
    mastery,
    luck,
    gm: Math.round(base.gm * gmScale),
  }
}

/**
 * Convenience wrapper — accepts a Card object and delegates to generateCardStats.
 */
export function getCardStats(card: Pick<Card, 'type' | 'rarity' | 'class'>): CardStats | null {
  return generateCardStats(card.type, card.rarity, card.class)
}

export default getCardStats
