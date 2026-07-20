/**
 * features/events/card-drop/action.ts
 *
 * Pure event function — determines whether a card drops after a mission,
 * and which rarity it is, based on the territory's base drop rate and the
 * player's card-boost percentage.
 *
 * No DB calls. The API route handler resolves the specific card from the
 * pool and persists the result.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CardDropState {
  /** Base probability (0–1) that a card drops for this territory. */
  baseDropRate: number
  /** Player's card-boost percentage (e.g. 25 = +25 % on the base rate). */
  cardBoostPercent?: number
  /**
   * Rarity distribution for a drop, e.g. { common: 0.7, rare: 0.2, epic: 0.1 }.
   * Values must sum to 1.0.
   */
  rarityDistribution: Record<string, number>
}

export interface CardDropResult {
  ok: boolean
  error?: string
  code?: string
  /** true when the RNG determined a card should drop. */
  dropped?: boolean
  /** The resolved rarity tier, present only when dropped:true. */
  rarity?: string
  /** Effective drop rate after boost was applied. */
  effectiveDropRate?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Event
// ─────────────────────────────────────────────────────────────────────────────

/**
 * cardDrop({ state, rng? })
 *
 * Returns ok:true with whether a card dropped and its rarity.
 * The `rng` parameter can be injected in tests to control randomness.
 */
export function cardDrop({
  state,
  rng = Math.random,
}: {
  state: CardDropState
  /** Injectable RNG (0 inclusive, 1 exclusive). */
  rng?: () => number
}): CardDropResult {
  const {
    baseDropRate,
    cardBoostPercent = 0,
    rarityDistribution,
  } = state

  if (baseDropRate < 0 || baseDropRate > 1) {
    return {
      ok: false,
      error: 'baseDropRate must be between 0 and 1.',
      code: 'INVALID_DROP_RATE',
    }
  }

  const rarityEntries = Object.entries(rarityDistribution)
  if (rarityEntries.length === 0) {
    return {
      ok: false,
      error: 'rarityDistribution must have at least one entry.',
      code: 'EMPTY_RARITY_DISTRIBUTION',
    }
  }

  // Apply boost: boost adds a flat percentage bonus on top of the base rate,
  // capped at 1.0 so we never exceed 100 % drop chance.
  const boostFraction = cardBoostPercent / 100
  const effectiveDropRate = Math.min(1, baseDropRate + baseDropRate * boostFraction)

  // Determine whether a card drops at all.
  if (rng() >= effectiveDropRate) {
    return { ok: true, dropped: false, effectiveDropRate }
  }

  // Resolve rarity via cumulative distribution.
  const roll = rng()
  let cumulative = 0
  for (const [rarity, weight] of rarityEntries) {
    cumulative += weight
    if (roll < cumulative) {
      return { ok: true, dropped: true, rarity, effectiveDropRate }
    }
  }

  // Fallback to the last rarity bucket (handles floating-point edge cases).
  const fallback = rarityEntries[rarityEntries.length - 1][0]
  return { ok: true, dropped: true, rarity: fallback, effectiveDropRate }
}
