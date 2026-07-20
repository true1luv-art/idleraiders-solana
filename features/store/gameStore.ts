'use client'

/**
 * features/store/gameStore.ts
 *
 * Zustand store — client-side authoritative state for the running game session.
 * Modelled after boom-miner's gameStore.ts but scoped to idleraiders:
 *   - No Phaser / map heroes — this is a turn-based idle game.
 *   - PlayerState mirrors the shape returned by GET /api/players/state.
 *   - Settlement markers (lastDepositTxHash / lastWithdrawalTxHash) let modals
 *     react to their own completion when detected by useSettlementNotifier.
 *
 * CLIENT-ONLY — never import this from server code.
 */

import { create } from 'zustand'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerState {
  _id?: string
  username?: string
  isRegistered?: boolean
  level?: number
  xp?: number
  energy?: number
  maxEnergy?: number
  lastEnergyRegen?: number
  coins?: number
  storageSlots?: number
  raidTokens?: number
  health?: Record<string, unknown>
  wallet?: Record<string, unknown>
  stats?: Record<string, unknown>
  fatigue?: Record<string, unknown>
  missionStats?: Record<string, unknown>
  milestones?: Record<string, unknown>
  boosts?: Record<string, number>
  inventory?: unknown[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cards?: Record<string, any>[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  potions?: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packs?: Record<string, any>
  activeMission?: Record<string, unknown> | null
  lands?: unknown[]
  [key: string]: unknown
}

// ─────────────────────────────────────────────────────────────────────────────
// Store shape
// ─────────────────────────────────────────────────────────────────────────────

interface GameStore {
  // ── Player state ────────────────────────────────────────────────────────────
  /** null until authenticated and first /api/players/state fetch completes. */
  playerState: PlayerState | null
  isLoading: boolean

  /** Replace the full player state (e.g. after fetchPlayerState). */
  setPlayerState: (state: PlayerState | null) => void

  /** Shallow-merge a partial update into playerState without a full refetch. */
  patchPlayerState: (patch: Partial<PlayerState>) => void

  /** Set the loading flag. */
  setLoading: (loading: boolean) => void

  // ── Settlement tracking (mirrors boom-miner setSettlement pattern) ──────────
  /**
   * txHash of the most recently settled deposit, as detected by
   * useSettlementNotifier. Wallet modals watch this to dismiss themselves on
   * their own completion.
   */
  lastDepositTxHash: string | null
  /**
   * txHash of the most recently settled withdrawal.
   */
  lastWithdrawalTxHash: string | null
  /**
   * txHash of the most recently settled purchase.
   */
  lastPurchaseTxHash: string | null

  /**
   * Records a freshly-detected settlement. Called by useSettlementNotifier.
   * Mirrors boom-miner's setSettlement(type, txHash).
   */
  setSettlement: (type: 'deposit' | 'withdrawal' | 'purchase', txHash: string) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set) => ({
  // ── Player state ─────────────────────────────────────────────────────────
  playerState: null,
  isLoading: false,

  setPlayerState: (state) => set({ playerState: state }),

  patchPlayerState: (patch) =>
    set((s) => {
      const base = s.playerState ?? {}
      const merged = { ...base, ...patch }
      // Deep-merge known nested objects; arrays are replaced atomically.
      for (const key of ['health', 'wallet', 'stats', 'fatigue', 'missionStats', 'milestones']) {
        const pv = patch[key]
        const bv = base[key]
        if (pv && bv && typeof pv === 'object' && !Array.isArray(pv)) {
          merged[key] = { ...(bv as object), ...(pv as object) }
        }
      }
      return { playerState: merged }
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  // ── Settlement tracking ───────────────────────────────────────────────────
  lastDepositTxHash: null,
  lastWithdrawalTxHash: null,
  lastPurchaseTxHash: null,

  setSettlement: (type, txHash) => {
    if (type === 'deposit') set({ lastDepositTxHash: txHash })
    else if (type === 'withdrawal') set({ lastWithdrawalTxHash: txHash })
    else if (type === 'purchase') set({ lastPurchaseTxHash: txHash })
  },
}))

// Dev-time global so the browser console can inspect the store.
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  ;(window as unknown as { __gameStore?: typeof useGameStore }).__gameStore = useGameStore
}
