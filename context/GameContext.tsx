'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useAuth } from './AuthContext'
import GAME_DATA from '@/public/data/index'

// Only log in development
const isDev = typeof window !== 'undefined' && process.env.NODE_ENV === 'development'

const log = (message?: unknown) => {
	if (isDev) console.log('[idleraiders-logs]', message || '')
}

const logWarn = (message?: unknown) => {
	if (isDev) console.warn('[idleraiders-logs]', message || '')
}

const logError = (message?: unknown) => {
	if (isDev) console.error('[idleraiders-logs]', message || '')
}

interface PlayerState {
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
	potions?: Record<string, any>[]
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	packs?: Record<string, any>[]
	activeMission?: Record<string, unknown> | null
	lands?: unknown[]
	[key: string]: unknown
}

interface GameData {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	CARDS?: Record<string, any>[]
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ITEMS?: Record<string, any>[]
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	WORLD?: Record<string, any>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	PROGRESSION?: Record<string, any>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ECONOMY?: Record<string, any>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	SYSTEM?: Record<string, any>
	[key: string]: unknown
}

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

const GameContext = createContext<GameContextValue | undefined>(undefined)

export const useGame = (): GameContextValue => {
	const ctx = useContext(GameContext)
	if (!ctx) throw new Error('useGame must be used within a GameProvider')
	return ctx
}

// Legacy hook for backwards compatibility
export const useSocket = useGame

interface GameProviderProps {
	children: ReactNode
}

export const GameProvider = ({ children }: GameProviderProps) => {
	const [isLoading, setIsLoading] = useState(false)
	const [playerState, setPlayerStateInternal] = useState<PlayerState | null>(null)
	const gameData = useMemo(() => GAME_DATA as GameData, [])

	const { isAuthenticated, setRegistered, getAuthToken } = useAuth()

	const patchPlayerState = useCallback((partialState: Partial<PlayerState>) => {
		if (!partialState) return
		setPlayerStateInternal((prev) => {
			const base = prev || {}
			const merged = { ...base, ...partialState }
			// Deep merge known nested objects, arrays remain atomic replacements.
			for (const key of ['health', 'wallet', 'stats', 'fatigue', 'missionStats', 'milestones']) {
				const partialVal = partialState[key]
				const baseVal = base[key]
				if (partialVal && baseVal && typeof partialVal === 'object' && !Array.isArray(partialVal)) {
					merged[key] = { ...(baseVal as object), ...(partialVal as object) }
				}
			}
			return merged
		})
	}, [])

	const setPlayerState = useCallback((state: PlayerState | null) => {
		setPlayerStateInternal(state)
	}, [])

	const apiRequest = useCallback(
		async <T = unknown,>(
			endpoint: string,
			options: RequestInit = {},
		): Promise<{ success: boolean; data?: T; delta?: Partial<PlayerState>; error?: string }> => {
			const token = getAuthToken()

			const headers: HeadersInit = {
				'Content-Type': 'application/json',
				...(options.headers || {}),
			}

			if (token) {
				;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
			}

			try {
				const response = await fetch(endpoint, {
					...options,
					headers,
				})

				const result = await response.json()

				// Handle 401 Unauthorized - token expired or invalid
				if (response.status === 401) {
					logWarn('401 Unauthorized - redirecting to login')
					window.location.href = '/login?session_expired=true'
					return { success: false, error: 'Session expired. Please login again.' }
				}

				if (!response.ok) {
					return { success: false, error: result.error || 'Request failed' }
				}

				// Auto-apply delta updates to player state
				if (result.delta) {
					patchPlayerState(result.delta)
				}

				// Auto-apply full player state updates
				if (result.playerState) {
					setPlayerState(result.playerState)
				}

				return { success: true, data: result as T, delta: result.delta }
			} catch (error) {
				const err = error as Error
				logError('API request failed: ' + err.message)
				return { success: false, error: err.message }
			}
		},
		[getAuthToken, patchPlayerState, setPlayerState],
	)

	const fetchPlayerState = useCallback(async () => {
		const token = getAuthToken()
		if (!token) return

		setIsLoading(true)
		try {
			const result = await apiRequest<{ playerState: PlayerState }>('/api/players/state')

			if (result.success && result.data?.playerState) {
				setPlayerState(result.data.playerState)

				if (result.data.playerState.isRegistered) {
					setRegistered(true)
				}
			}
		} catch (error) {
			logError(
				'Failed to fetch player state: ' + (error instanceof Error ? error.message : String(error)),
			)
			toast.error('Failed to load player data')
		} finally {
			setIsLoading(false)
		}
	}, [getAuthToken, apiRequest, setPlayerState, setRegistered])

	// Fetch player state on authentication
	useEffect(() => {
		if (isAuthenticated) {
			fetchPlayerState()
		} else {
			setPlayerState(null)
		}
	}, [isAuthenticated, fetchPlayerState, setPlayerState])

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
		[
			isLoading,
			playerState,
			gameData,
			patchPlayerState,
			setPlayerState,
			fetchPlayerState,
			apiRequest,
		],
	)

	return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

// Legacy export for backwards compatibility
export const SocketProvider = GameProvider
