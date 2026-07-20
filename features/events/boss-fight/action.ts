/**
 * features/events/boss-fight/action.ts
 *
 * Pure event function — resolves a single round of boss combat.
 * No DB calls. The API route handler persists the result.
 *
 * Rules enforced:
 *  1. Boss must be alive (hp > 0).
 *  2. Player must have at least 1 raid token.
 *  3. Attack power must be > 0.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BossFightState {
  playerId: string
  bossCurrentHp: number
  bossMaxHp: number
  playerAttackPower: number
  raidTokens: number
  raidTokenCost?: number
}

export interface BossFightResult {
  ok: boolean
  error?: string
  code?: string
  /** Damage dealt this round. */
  damageDealt?: number
  /** Boss HP after this round. */
  newBossHp?: number
  /** Whether the boss was defeated this round. */
  bossDefeated?: boolean
  /** Raid tokens remaining after this round. */
  newRaidTokens?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Event
// ─────────────────────────────────────────────────────────────────────────────

/**
 * bossFight({ state })
 *
 * Returns ok:true with combat results when all guards pass.
 * Damage includes a ±10 % random variance.
 */
export function bossFight({ state }: { state: BossFightState }): BossFightResult {
  const {
    bossCurrentHp,
    playerAttackPower,
    raidTokens,
    raidTokenCost = 1,
  } = state

  if (bossCurrentHp <= 0) {
    return { ok: false, error: 'Boss is already defeated.', code: 'BOSS_DEAD' }
  }

  if (raidTokens < raidTokenCost) {
    return {
      ok: false,
      error: `Not enough raid tokens. Need ${raidTokenCost}, have ${raidTokens}.`,
      code: 'INSUFFICIENT_RAID_TOKENS',
    }
  }

  if (playerAttackPower <= 0) {
    return { ok: false, error: 'Attack power must be greater than 0.', code: 'NO_ATTACK' }
  }

  // ±10 % variance
  const variance = 0.9 + Math.random() * 0.2
  const damageDealt = Math.max(1, Math.round(playerAttackPower * variance))
  const newBossHp = Math.max(0, bossCurrentHp - damageDealt)
  const bossDefeated = newBossHp <= 0
  const newRaidTokens = raidTokens - raidTokenCost

  return { ok: true, damageDealt, newBossHp, bossDefeated, newRaidTokens }
}
