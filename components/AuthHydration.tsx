'use client'

/**
 * components/AuthHydration.tsx
 *
 * Mounts once in the root layout to restore auth session state from
 * localStorage/cookies into the Zustand authStore. Renders nothing.
 */

import { useEffect } from 'react'
import { useAuthStore } from '@/features/store/authStore'

export function AuthHydration() {
  useEffect(() => {
    useAuthStore.getState().hydrate()
  }, [])
  return null
}
