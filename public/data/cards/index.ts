import { LEGENDARY_CARDS } from './legendary'
import { EPIC_CARDS } from './epic'
import { RARE_CARDS } from './rare'
import { UNCOMMON_CARDS } from './uncommon'
import { COMMON_CARDS } from './common'
import { STORIES_CARD_DATA } from './stories'

import getCardStats from './stats'

// ─── Combine All Card Definitions ────────────────────────
// Rarity order: legendary → epic → rare → uncommon → common → stories

const RAW_CARDS = [
  ...LEGENDARY_CARDS,
  ...EPIC_CARDS,
  ...RARE_CARDS,
  ...UNCOMMON_CARDS,
  ...COMMON_CARDS,
  ...STORIES_CARD_DATA,
]

// ─── Enrich Cards With Stats ─────────────────────────────

function enrichCard(card: { type: string; rarity: string;[key: string]: unknown }) {
  return {
    ...card,
    stats: getCardStats(card),
  }
}

// ─── Final Card List ─────────────────────────────────────

export const CARDS_DATA = RAW_CARDS.map(enrichCard)

export default CARDS_DATA
