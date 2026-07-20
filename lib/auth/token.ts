/**
 * lib/auth/token.ts
 *
 * Standalone cookie helpers for the auth token.
 * Imported by both authStore and gameStore to avoid circular dependencies.
 */

export const getAuthToken = (): string | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )auth_token=([^;]+)'))
  return match ? match[2] : null
}

export const setAuthCookie = (token: string, days = 7): void => {
  const maxAge = days * 24 * 60 * 60
  document.cookie = `auth_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export const deleteAuthCookie = (): void => {
  document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Lax'
}
