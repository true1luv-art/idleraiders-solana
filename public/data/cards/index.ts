import { HEROES_CARD_DATA } from './heroes/index'
import { STORIES_CARD_DATA } from './stories'

import getCardStats from './cardConfig'

// ─── Combine All Card Definitions ────────────────────────

const RAW_CARDS = [
  ...HEROES_CARD_DATA,
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
