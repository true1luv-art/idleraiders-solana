'use client'

/**
 * context/GameContext.tsx
 *
 * Thin bootstrap layer — handles authentication-driven player-state loading
 * and exposes an apiRequest() helper. All actual state now lives in the
 * Zustand gameStore (features/store/gameStore.ts), matching the boom-miner
 * architectural pattern where Context = bootstrap only, Store = runtime state.
 *
 * Consumers should prefer:
 *   import { useGameStore } from '@/features/store/gameStore'
 *
 * The useGame() hook and GameProvider are kept for backward compatibility.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useAuth } from './AuthContext'
import GAME_DATA from '@/public/data/index'
import { useGameStore, type PlayerState } from '@/features/store/gameStore'

// ─────────────────────────────────────────────────────────────────────────────
// Logging helpers (dev-only)
// ─────────────────────────────────────────────────────────────────────────────

const isDev = typeof window !== 'undefined' && process.env.NODE_ENV === 'development'
const log = (...args: unknown[]) => { if (isDev) console.log('[idleraiders-logs]', ...args) }
const logWarn = (...args: unknown[]) => { if (isDev) console.warn('[idleraiders-logs]', ...args) }
const logError = (...args: unknown[]) => { if (isDev) console.error('[idleraiders-logs]', ...args) }

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GameData = Record<string, any>

interface GameContextValue {
  isLoading: boolean
  playerState: PlayerState | null
  gameData: GameData
  patchPlayerState: (partialState: Partial<PlayerState>) => void
  setPlayerState: (state: PlayerState | null) => void
  fetchPlayerState: () => Promise<void>
  apiRequest: <T = unknown>(
    endpoint: string,
    options?: RequestInit,
  ) => Promise<{ success: boolean; data?: T; delta?: Partial<PlayerState>; error?: string }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const GameContext = createContext<GameContextValue | undefined>(undefined)

export const useGame = (): GameContextValue => {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within a GameProvider')
  return ctx
}

// Legacy alias for backwards compatibility
export const useSocket = useGame

interface GameProviderProps {
  children: ReactNode
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export const GameProvider = ({ children }: GameProviderProps) => {
  // Read/write from the Zustand store — single source of truth.
  const playerState = useGameStore((s) => s.playerState)
  const isLoading = useGameStore((s) => s.isLoading)
  const setPlayerState = useGameStore((s) => s.setPlayerState)
  const patchPlayerState = useGameStore((s) => s.patchPlayerState)
  const setLoading = useGameStore((s) => s.setLoading)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameData = useMemo(() => GAME_DATA as GameData, [])

  const { isAuthenticated, setRegistered, getAuthToken } = useAuth()

  // ── apiRequest ──────────────────────────────────────────────────────────────
  const apiRequest = useCallback(
    async <T = unknown,>(
      endpoint: string,
      options: RequestInit = {},
    ): Promise<{ success: boolean; data?: T; delta?: Partial<PlayerState>; error?: string }> => {
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
          logWarn('401 Unauthorized — redirecting to login')
          window.location.href = '/login?session_expired=true'
          return { success: false, error: 'Session expired. Please login again.' }
        }

        if (!response.ok) {
          return { success: false, error: result.error ?? 'Request failed' }
        }

        // Auto-apply delta updates from the response envelope.
        if (result.delta) patchPlayerState(result.delta)
        if (result.playerState) setPlayerState(result.playerState)

        return { success: true, data: result as T, delta: result.delta }
      } catch (error) {
        logError('API request failed:', (error as Error).message)
        return { success: false, error: (error as Error).message }
      }
    },
    [getAuthToken, patchPlayerState, setPlayerState],
  )

  // ── fetchPlayerState ────────────────────────────────────────────────────────
  const fetchPlayerState = useCallback(async () => {
    const token = getAuthToken()
    if (!token) return

    setLoading(true)
    try {
      const result = await apiRequest<{ playerState: PlayerState }>('/api/players/state')
      if (result.success && result.data?.playerState) {
        setPlayerState(result.data.playerState)
        if (result.data.playerState.isRegistered) setRegistered(true)
      }
    } catch (error) {
      logError('Failed to fetch player state:', (error instanceof Error ? error.message : String(error)))
      toast.error('Failed to load player data')
    } finally {
      setLoading(false)
    }
  }, [getAuthToken, apiRequest, setPlayerState, setRegistered, setLoading])

  // ── Bootstrap: fetch on auth change ────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      log('authenticated — fetching player state')
      fetchPlayerState()
    } else {
      setPlayerState(null)
    }
  }, [isAuthenticated, fetchPlayerState, setPlayerState])

  // ── Context value ───────────────────────────────────────────────────────────
  const value = useMemo(
    () => ({
      isLoading,
      playerState,
      gameData,
      patchPlayerState,
      setPlayerState,
      fetchPlayerState,
      apiRequest,
    }),
    [isLoading, playerState, gameData, patchPlayerState, setPlayerState, fetchPlayerState, apiRequest],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

// Legacy export for backwards compatibility
export const SocketProvider = GameProvider
export type { PlayerState }
