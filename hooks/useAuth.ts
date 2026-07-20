/**
 * hooks/useAuth.ts
 *
 * Re-exports the auth Zustand store as a drop-in hook replacement for the
 * old useAuth() from context/AuthContext.tsx.
 */
export { useAuthStore as useAuth } from '@/features/store/authStore'
