import { LEGENDARY_HEROES } from './legendary'
import { EPIC_HEROES } from './epic'
import { RARE_HEROES } from './rare'
import { UNCOMMON_HEROES } from './uncommon'
import { COMMON_HEROES } from './common'

// ─── Full Hero Roster ─────────────────────────────────────
// Rarity order: legendary → epic → rare → uncommon → common
// Season 1: 1L / 2E / 3R / 6U / 8C = 20 total

export const HEROES_CARD_DATA = [
  ...LEGENDARY_HEROES,
  ...EPIC_HEROES,
  ...RARE_HEROES,
  ...UNCOMMON_HEROES,
  ...COMMON_HEROES,
]

export default HEROES_CARD_DATA
