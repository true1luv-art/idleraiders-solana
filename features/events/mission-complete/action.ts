/**
 * features/events/mission-complete/action.ts
 *
 * Pure event function — computes mission completion rewards.
 * No DB calls. The API route handler persists the result.
 *
 * Rules enforced:
 *  1. Mission must belong to the requesting player.
 *  2. Mission must not already be completed.
 *  3. Mission duration must have elapsed.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MissionCompleteState {
  playerId: string
  missionOwnerId: string
  missionStatus: string
  missionEndTime: number
  /** Base XP reward defined on the mission template. */
  baseXp: number
  /** Base coin reward defined on the mission template. */
  baseCoins: number
  /** Optional XP boost multiplier (1.0 = no boost). */
  xpBoostMultiplier?: number
}

export interface MissionCompleteResult {
  ok: boolean
  error?: string
  code?: string
  /** Final XP to award. */
  xpGained?: number
  /** Final coins to award. */
  coinsGained?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Event
// ─────────────────────────────────────────────────────────────────────────────

/**
 * missionComplete({ state })
 *
 * Returns ok:true with computed rewards when all guards pass.
 */
export function missionComplete({
  state,
}: {
  state: MissionCompleteState
}): MissionCompleteResult {
  const {
    playerId,
    missionOwnerId,
    missionStatus,
    missionEndTime,
    baseXp,
    baseCoins,
    xpBoostMultiplier = 1,
  } = state

  if (playerId !== missionOwnerId) {
    return { ok: false, error: 'Mission does not belong to this player.', code: 'NOT_OWNER' }
  }

  if (missionStatus !== 'active') {
    return {
      ok: false,
      error: `Mission is not active (status: ${missionStatus}).`,
      code: 'NOT_ACTIVE',
    }
  }

  if (Date.now() < missionEndTime) {
    return {
      ok: false,
      error: 'Mission has not completed yet.',
      code: 'NOT_FINISHED',
    }
  }

  const xpGained = Math.floor(baseXp * xpBoostMultiplier)
  const coinsGained = baseCoins

  return { ok: true, xpGained, coinsGained }
}
