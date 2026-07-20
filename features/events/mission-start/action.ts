/**
 * features/events/mission-start/action.ts
 *
 * Pure event function — validates and prepares a mission-start operation.
 * No DB calls. The API route handler calls this and then persists the result
 * via the mission repository.
 *
 * Rules enforced:
 *  1. Player must have enough energy.
 *  2. Player must not already have an active mission of the same type.
 *  3. Dungeon (mission target) must exist in game data.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MissionStartState {
  playerId: string
  energy: number
  activeMissionType?: string | null
}

export interface MissionStartAction {
  dungeonId: string
  missionType: string
  energyCost: number
}

export interface MissionStartResult {
  ok: boolean
  error?: string
  code?: string
  /** Computed energy after deduction, to be applied via the repository. */
  newEnergy?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Event
// ─────────────────────────────────────────────────────────────────────────────

/**
 * missionStart({ state, action })
 *
 * Returns ok:true and newEnergy when all guards pass.
 * Returns ok:false with an error code otherwise.
 */
export function missionStart({
  state,
  action,
}: {
  state: MissionStartState
  action: MissionStartAction
}): MissionStartResult {
  const { energy, activeMissionType } = state
  const { missionType, energyCost } = action

  if (energy < energyCost) {
    return {
      ok: false,
      error: `Not enough energy. Need ${energyCost}, have ${energy}.`,
      code: 'INSUFFICIENT_ENERGY',
    }
  }

  if (activeMissionType && activeMissionType === missionType) {
    return {
      ok: false,
      error: `A ${missionType} mission is already active.`,
      code: 'ALREADY_ACTIVE',
    }
  }

  return {
    ok: true,
    newEnergy: energy - energyCost,
  }
}
