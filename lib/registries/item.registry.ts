import GAME_DATA from '@/public/data'
import type { GameItem } from '@/lib/types'

/**
 * Pre-built O(1) lookup map for items (potions and packs).
 * Frozen to prevent accidental mutations.
 * Materials have been removed from the game — items collection is no longer used.
 */

export const ITEMS_BY_ID = Object.freeze(
  Object.fromEntries(
    ((GAME_DATA as { ITEMS?: GameItem[] }).ITEMS ?? []).map((item) => [item.id, item]),
  ),
) as Readonly<Record<string, GameItem>>

/**
 * Get item by ID with O(1) lookup
 */
export function getItemById(itemId: string): GameItem | undefined {
  return ITEMS_BY_ID[itemId]
}
