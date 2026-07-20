// Materials have been removed from the game.
// Potions are embedded on the Player document (player.potions).
// Packs immediately mint cards — no intermediate item storage.

// ─────────────────────────────────────────────
// Potions
// ─────────────────────────────────────────────

export const MATERIALS: never[] = []

export const POTIONS = [
  {
    id: 'energy_potion',
    name: 'Energy Potion',
    description: 'Fully refills energy to 100',
    catergory: 'potion',

    data: {
      type: 'energy_restore',
      amount: 100,
      baseChance: 0.04,
      chanceMultiplier: {
        scout: 1.0,
        patrol: 1.2,
        expedition: 1.4,
        siege: 1.7,
        war: 2.0,
      },
    },
  },

  {
    id: 'exp_potion',
    name: 'EXP Potion',
    description: '2× XP on next mission',
    catergory: 'potion',

    data: {
      type: 'exp_boost',
      multiplier: 2,
      baseChance: 0.04,
      chanceMultiplier: {
        scout: 1.0,
        patrol: 1.2,
        expedition: 1.4,
        siege: 1.7,
        war: 2.0,
      },
    },
  },
]

// ─────────────────────────────────────────────
// Card Packs
// ─────────────────────────────────────────────

export const PACKS = [
  {
    id: 'standard_pack',
    name: 'Standard Pack',
    description: 'Contains 3 cards rolled from the standard rarity table',
    catergory: 'pack',

    buy: {
      coins: 10000,
      dollars: 1, // Sale price for first month; returns to $2 after sale ends
    },

    data: {
      cardCount: 3,
      dropRates: {
        common: 0.65,
        uncommon: 0.23,
        rare: 0.10,
        epic: 0.019,
        legendary: 0.001,
      },
    },
  },

  {
    id: 'booster_pack',
    name: 'Booster Pack',
    description: 'Contains 1 booster card',
    catergory: 'pack',

    buy: {
      shards: 100,
      dollars: 3, // Sale price for first month; returns to $5 after sale ends
    },

    data: {
      cardCount: 1,
      dropRates: {
        common: 0.65,
        uncommon: 0.23,
        rare: 0.10,
        epic: 0.019,
        legendary: 0.001,
      },
    },
  },
]

// ─────────────────────────────────────────────
// Items Data Export
// ─────────────────────────────────────────────

// Flat items array (used by registry builder)
export const ITEMS_DATA_ARRAY = [...POTIONS, ...PACKS]

// Full items object (GAME_DATA.ITEMS)
export const ITEMS_DATA = ITEMS_DATA_ARRAY

export default ITEMS_DATA
