/**
 * features/events/pack-open/action.ts
 *
 * Pure event function — resolves pack contents from rarity distribution.
 * No DB calls and no coin deduction. The API route handler (or
 * items/repository.server.ts) validates cost, deducts coins, mints
 * cards, and persists history.
 *
 * Rules:
 *  1. Pack must have a valid rarity distribution that sums > 0.
 *  2. cardCount must be >= 1.
 *  3. A guaranteed rarity (if set) applies only to the first card.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PackOpenState {
  /** Pack definition identifier (used for tracing only). */
  packId: string
  /**
   * Probability weights per rarity tier, e.g.
   * { common: 0.65, rare: 0.25, epic: 0.09, legendary: 0.01 }
   * Values do not need to sum exactly to 1 — they are normalised internally.
   */
  dropRates: Record<string, number>
  /** Total number of cards to roll for one pack. Defaults to 1. */
  cardCount?: number
  /**
   * When set, the first card is forced to this rarity tier.
   * Subsequent cards use the normal distribution.
   */
  guaranteedRarity?: string | null
}

export interface PackOpenRoll {
  /** Zero-based index of this card within the pack. */
  index: number
  /** Resolved rarity for this slot. */
  rarity: string
  /** Whether this slot was forced by guaranteedRarity. */
  guaranteed: boolean
}

export interface PackOpenResult {
  ok: boolean
  error?: string
  code?: string
  /** One entry per card in the pack. */
  rolls?: PackOpenRoll[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function rollRarity(
  dropRates: Record<string, number>,
  rng: () => number
): string {
  const entries = Object.entries(dropRates)
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  if (total === 0) return 'common'

  const roll = rng() * total
  let cumulative = 0
  for (const [rarity, weight] of entries) {
    cumulative += weight
    if (roll < cumulative) return rarity
  }
  return entries[entries.length - 1][0]
}

// ─────────────────────────────────────────────────────────────────────────────
// Event
// ─────────────────────────────────────────────────────────────────────────────

/**
 * packOpen({ state, rng? })
 *
 * Returns ok:true with one PackOpenRoll per card slot.
 * The caller maps each roll to an actual card from the pool.
 */
export function packOpen({
  state,
  rng = Math.random,
}: {
  state: PackOpenState
  /** Injectable RNG (0 inclusive, 1 exclusive). */
  rng?: () => number
}): PackOpenResult {
  const {
    packId,
    dropRates,
    cardCount = 1,
    guaranteedRarity = null,
  } = state

  if (cardCount < 1) {
    return {
      ok: false,
      error: `Pack ${packId}: cardCount must be >= 1 (got ${cardCount}).`,
      code: 'INVALID_CARD_COUNT',
    }
  }

  const hasRates = Object.values(dropRates).some((w) => w > 0)
  if (!hasRates) {
    return {
      ok: false,
      error: `Pack ${packId}: dropRates must have at least one positive weight.`,
      code: 'EMPTY_DROP_RATES',
    }
  }

  const rolls: PackOpenRoll[] = []

  for (let i = 0; i < cardCount; i++) {
    const isGuaranteedSlot = i === 0 && guaranteedRarity != null
    const rarity = isGuaranteedSlot
      ? guaranteedRarity!
      : rollRarity(dropRates, rng)

    rolls.push({ index: i, rarity, guaranteed: isGuaranteedSlot })
  }

  return { ok: true, rolls }
}
