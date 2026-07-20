// ─────────────────────────────────────────────
// Economy Configuration
// Flat file — was economy/economy.ts
// ─────────────────────────────────────────────

export const MISSION_REWARDS = {
  BASE_TOKEN_REWARD: 10,
}

// ─────────────────────────────────────────────
// Marketplace Configuration
// ─────────────────────────────────────────────

export const MARKETPLACE = {
  MARKET_FEE_PERCENT: 5,
  LISTING_DURATION_HOURS: 168,
  LISTING_CREATION_FEE: 100,
  MIN_PRICE: 1,
  MAX_PRICE: 100000,
}

// ─────────────────────────────────────────────
// Material Conversion Configuration
// Note: live conversion logic lives in lib/modules/items/item.service.ts:convertMaterials.
// These values are kept in sync for documentation / read-only consumers.
//   - Trades are restricted to the next zone up (D1→D2 … D9→D10)
//   - Coin cost scales with target zone index: cost = ZONE_INDEX × coinCostPerZone
//     (D2=25, D3=50, D4=75, D5=100, D6=125, D7=150, D8=175, D9=200, D10=225)
// ─────────────────────────────────────────────

export const MATERIAL_CONVERSION = {
  ratio: 5,             // 5× source → 1× target
  coinCostPerZone: 25,  // multiplied by destination zone index (1..9)
  // Legacy field retained for backwards compatibility — represents the average
  // cost across zones rather than a flat fee. Prefer coinCostPerZone for new code.
  coinCost: 25,
}

// ─────────────────────────────────────────────
// Economy Data Export
// ─────────────────────────────────────────────

export const ECONOMY_DATA = {
  MISSION_REWARDS,
  MARKETPLACE,
  MATERIAL_CONVERSION,
}

export default ECONOMY_DATA
