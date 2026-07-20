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
 *   - apiRequest and fetchPlayerState were previously in GameContext and are
 *     now store actions, eliminating the need for a React Context provider.
 *
 * CLIENT-ONLY — never import this from server code.
 */

import { create } from 'zustand'
import { getAuthToken } from '@/lib/auth/token'

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

  // ── API helpers (formerly in GameContext) ───────────────────────────────────
  /**
   * Authenticated fetch wrapper. Reads the auth_token cookie, attaches it as
   * a Bearer header, auto-applies delta/playerState from the response envelope,
   * and redirects to /login on 401.
   */
  apiRequest: <T = unknown>(
    endpoint: string,
    options?: RequestInit,
  ) => Promise<{ success: boolean; data?: T; delta?: Partial<PlayerState>; error?: string }>

  /**
   * Loads the current player's full state from GET /api/players/state and
   * writes it into the store.
   */
  fetchPlayerState: () => Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
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

  // ── API helpers ─────────────────────────────────────────────────────────────

  apiRequest: async <T = unknown>(
    endpoint: string,
    options: RequestInit = {},
  ) => {
    const token = getAuthToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined ?? {}),
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    try {
      const response = await fetch(endpoint, { ...options, headers })
      const result = await response.json()

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login?session_expired=true'
        }
        return { success: false, error: 'Session expired. Please login again.' }
      }

      if (!response.ok) {
        return { success: false, error: result.error ?? 'Request failed' }
      }

      if (result.delta) get().patchPlayerState(result.delta)
      if (result.playerState) get().setPlayerState(result.playerState)

      return { success: true, data: result as T, delta: result.delta }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  fetchPlayerState: async () => {
    const token = getAuthToken()
    if (!token) return

    get().setLoading(true)
    try {
      const result = await get().apiRequest<{ playerState: PlayerState }>('/api/players/state')
      if (result.success && result.data?.playerState) {
        get().setPlayerState(result.data.playerState)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[idleraiders-logs] Failed to fetch player state:', (error as Error).message)
      }
    } finally {
      get().setLoading(false)
    }
  },
}))

// Dev-time global so the browser console can inspect the store.
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  ;(window as unknown as { __gameStore?: typeof useGameStore }).__gameStore = useGameStore
}
