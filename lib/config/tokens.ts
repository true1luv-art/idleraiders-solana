/**
 * Token Symbols — Single Source of Truth (Server-Side)
 * ─────────────────────────────────────────────────────
 * Used by backend services, transaction processors, and API routes.
 * The frontend currently keeps its own usages and is NOT migrated here.
 */

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/** Main (and only) currency. Earned in-game; used for entry fees, guild creation, revival, etc. */
export const TOKEN_MAIN = 'REALMC' as const

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/** The only valid token symbol. */
export type TokenSymbol = typeof TOKEN_MAIN

/** All valid symbols, for runtime validation against API input. */
export const TOKEN_SYMBOLS: readonly TokenSymbol[] = [TOKEN_MAIN] as const

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Type guard — narrows arbitrary input to a valid TokenSymbol. */
export function isTokenSymbol(value: unknown): value is TokenSymbol {
  return typeof value === 'string' && TOKEN_SYMBOLS.includes(value as TokenSymbol)
}

/**
 * Map a token symbol to the Player document field that holds its balance.
 */
export function getBalanceField(_symbol: TokenSymbol): 'coins' {
  return 'coins'
}

/**
 * Map a token symbol to the lifetime-total field name used in socket events.
 */
export function getTotalField(_symbol: TokenSymbol): 'totalCoins' {
  return 'totalCoins'
}

// ─────────────────────────────────────────────
// Hive Engine precision (decimal places)
// ─────────────────────────────────────────────

/** Decimal precision for REALMC as configured on Hive Engine. */
export const TOKEN_PRECISION: Record<TokenSymbol, number> = {
  [TOKEN_MAIN]: 0, // REALMC — integer
}

/** Lookup the token's on-chain decimal precision. */
export function getTokenPrecision(symbol: TokenSymbol): number {
  return TOKEN_PRECISION[symbol]
}

/**
 * Smallest representable unit for the token (1 for precision 0).
 */
export function getTokenMinUnit(symbol: TokenSymbol): number {
  return Math.pow(10, -getTokenPrecision(symbol))
}

/**
 * Format a numeric quantity into the string Hive Engine accepts for REALMC.
 * Truncates excess decimals (never rounds up).
 */
export function formatTokenQuantity(quantity: number, symbol: TokenSymbol): string {
  const precision = getTokenPrecision(symbol)
  const factor = Math.pow(10, precision)
  const truncated = Math.floor(quantity * factor) / factor
  return truncated.toFixed(precision)
}

/**
 * Round a quantity UP to the token's precision.
 */
export function ceilToTokenPrecision(quantity: number, symbol: TokenSymbol): number {
  const precision = getTokenPrecision(symbol)
  const factor = Math.pow(10, precision)
  return Math.ceil(quantity * factor) / factor
}
