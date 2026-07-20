// ─────────────────────────────────────────────
// System Configuration
// Flat file — was system/system.ts
// ─────────────────────────────────────────────

export const PLAYER = {
  MAX_LEVEL: 150,
  STARTING_LEVEL: 1,
  STARTING_XP: 0,
}

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
