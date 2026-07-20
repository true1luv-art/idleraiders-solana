'use client'

/**
 * features/store/authStore.ts
 *
 * Zustand store replacing context/AuthContext.tsx.
 * No Context Provider needed — any component can call useAuthStore() directly.
 *
 * Hydration: call useAuthStore.getState().hydrate() once on client mount
 * (handled by components/AuthHydration.tsx in the root layout).
 */

import { create } from 'zustand'
import { signInWithHiveKeychain, isHiveKeychainAvailable } from '@/lib/auth/wallet-adapters/hive'
import { getAuthToken, setAuthCookie, deleteAuthCookie } from '@/lib/auth/token'

// ─────────────────────────────────────────────────────────────────────────────
// Dev-only logger
// ─────────────────────────────────────────────────────────────────────────────

const isDev = typeof window !== 'undefined' && process.env.NODE_ENV === 'development'
const log = (...args: unknown[]) => { if (isDev) console.log('[idleraiders-logs]', ...args) }
const logError = (...args: unknown[]) => { if (isDev) console.error('[idleraiders-logs]', ...args) }

// ─────────────────────────────────────────────────────────────────────────────
// Store shape
// ─────────────────────────────────────────────────────────────────────────────

interface AuthStore {
  username: string | null
  isAuthenticated: boolean
  isRegistered: boolean
  isLoading: boolean
  error: string | null

  /** Call once on client mount to restore session from localStorage/cookies. */
  hydrate: () => void
  login: (name: string, referral?: string) => Promise<{ success: boolean; isRegistered?: boolean }>
  logout: () => void
  setRegistered: (value: boolean) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>((set) => ({
  username: null,
  isAuthenticated: false,
  isRegistered: false,
  isLoading: false,
  error: null,

  hydrate: () => {
    if (typeof localStorage === 'undefined') return
    const storedUsername = localStorage.getItem('hive_username')
    const storedToken = getAuthToken()
    if (storedUsername && storedToken) {
      set({ username: storedUsername, isAuthenticated: true })
    }
  },

  login: async (name: string, referral = '') => {
    if (!isHiveKeychainAvailable()) {
      log('Hive Keychain not found on window')
      set({ error: 'Hive Keychain extension not found. Please install it first.' })
      return { success: false }
    }

    log('Starting keychain login')
    set({ isLoading: true, error: null })

    try {
      log('Calling signInWithHiveKeychain')
      const result = await signInWithHiveKeychain(name)

      log('Signature obtained, sending login request')
      const response = await fetch('/api/players/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, signature: result.signature, referral }),
      })

      const data = await response.json()
      if (!data.token) {
        throw new Error(data.error || 'Login failed')
      }

      const playerIsRegistered = data.player?.isRegistered ?? false

      localStorage.setItem('hive_username', name)
      setAuthCookie(data.token, 7)

      set({
        username: name,
        isAuthenticated: true,
        isRegistered: playerIsRegistered,
        isLoading: false,
        error: null,
      })
      log('Login successful')
      return { success: true, isRegistered: playerIsRegistered }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      set({ isLoading: false, error: errorMessage })
      logError('Login error: ' + errorMessage)
      return { success: false }
    }
  },

  logout: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('hive_username')
    }
    deleteAuthCookie()
    set({ username: null, isAuthenticated: false, isRegistered: false, error: null })
    // Clear game state reactively — game/layout.tsx watches isAuthenticated and calls
    // setPlayerState(null) when it goes false. No direct cross-store dependency needed.
  },

  setRegistered: (value: boolean) => set({ isRegistered: value }),
}))
