// ─────────────────────────────────────────────
// Game Data Root Aggregator
// Exports all game configuration data for the application
// ─────────────────────────────────────────────

import CARDS_DATA from './cards'
import ITEMS_DATA from './items'
import WORLD_DATA from './world'
import PROGRESSION_DATA from './progression'
import SYSTEM_DATA from './system'
import ECONOMY_DATA from './economy'

const GAME_DATA = {
  CARDS: CARDS_DATA,
  ITEMS: ITEMS_DATA,
  WORLD: WORLD_DATA,
  PROGRESSION: PROGRESSION_DATA,
  SYSTEM: SYSTEM_DATA,
  ECONOMY: ECONOMY_DATA,
}

export { GAME_DATA }
export default GAME_DATA
