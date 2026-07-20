/**
 * features/events/energy-regen/action.ts
 *
 * Pure event function — computes regenerated energy from elapsed time.
 * No DB calls. The API route handler persists the result via the player
 * repository.
 *
 * Rules:
 *  1. Energy cannot exceed maxEnergy.
 *  2. Boost multiplier must be >= 1.0 (no debuffs handled here).
 *  3. Returns the delta so the caller can decide how to apply it.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EnergyRegenState {
  /** Current energy before regen. */
  energy: number
  /** Absolute maximum energy. */
  maxEnergy: number
  /** Unix ms timestamp of the last regen cycle. */
  lastCycleUpdate: number
  /** Energy restored per minute at base rate (e.g. 1). */
  regenRatePerMinute?: number
  /** Multiplicative boost on top of base rate (1.0 = no boost). */
  boostMultiplier?: number
}

export interface EnergyRegenResult {
  ok: boolean
  error?: string
  code?: string
  /** Energy value after regen (capped at maxEnergy). */
  newEnergy?: number
  /** How much energy was actually restored (0 if already full). */
  delta?: number
  /** Unix ms timestamp to record as the new lastCycleUpdate. */
  newLastCycleUpdate?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_REGEN_RATE_PER_MINUTE = 1
const MS_PER_MINUTE = 60_000

// ─────────────────────────────────────────────────────────────────────────────
// Event
// ─────────────────────────────────────────────────────────────────────────────

/**
 * energyRegen({ state, now? })
 *
 * Computes how much energy has regenerated since `lastCycleUpdate`.
 * Returns ok:true with the new energy total and the delta applied.
 */
export function energyRegen({
  state,
  now = Date.now(),
}: {
  state: EnergyRegenState
  /** Override current time (useful in tests). */
  now?: number
}): EnergyRegenResult {
  const {
    energy,
    maxEnergy,
    lastCycleUpdate,
    regenRatePerMinute = DEFAULT_REGEN_RATE_PER_MINUTE,
    boostMultiplier = 1,
  } = state

  if (energy >= maxEnergy) {
    return {
      ok: true,
      newEnergy: maxEnergy,
      delta: 0,
      newLastCycleUpdate: lastCycleUpdate,
    }
  }

  if (boostMultiplier < 1) {
    return {
      ok: false,
      error: 'Boost multiplier must be >= 1.0.',
      code: 'INVALID_BOOST',
    }
  }

  const elapsedMs = Math.max(0, now - lastCycleUpdate)
  const elapsedMinutes = elapsedMs / MS_PER_MINUTE
  const effectiveRate = regenRatePerMinute * boostMultiplier
  const rawGain = Math.floor(elapsedMinutes * effectiveRate)
  const delta = Math.min(rawGain, maxEnergy - energy)
  const newEnergy = energy + delta

  return {
    ok: true,
    newEnergy,
    delta,
    newLastCycleUpdate: now,
  }
}
