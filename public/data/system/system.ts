// ─────────────────────────────────────────────
// Player Configuration
// ─────────────────────────────────────────────

export const PLAYER = {
  MAX_LEVEL: 150,

  STARTING_LEVEL: 1,

  STARTING_XP: 0,
}

// ─────────────────────────────────────────────
// Energy System
// ─────────────────────────────────────────────

export const ENERGY = {
  MAX: 100,

  REGEN_INTERVAL: 180, // seconds (3 minutes)

  PER_TICK: 1,
}

// ─────────────────────────────────────────────
// System Data Export
// ─────────────────────────────────────────────

export const SYSTEM_DATA = {
  PLAYER,
  ENERGY,
}

export default SYSTEM_DATA
