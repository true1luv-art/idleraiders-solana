// ─────────────────────────────────────────────
// Mission Reward Configuration
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
// Economy Data Export
// ─────────────────────────────────────────────

export const ECONOMY_DATA = {
  MISSION_REWARDS,

  MARKETPLACE,
}

export default ECONOMY_DATA
