/**
 * @deprecated card.logic.ts is not referenced externally.
 * Card pack-rolling logic was moved to lib/modules/items/repository.server.ts
 * and features/events/pack-open/action.ts.
 */
import GAME_DATA from '@/public/data'
import type { Card } from '../../types'

// Flatten all card categories into a single array
const CARDS_DATA = GAME_DATA.CARDS as Record<string, Card[]>
const ALL_CARDS: Card[] = Object.values(CARDS_DATA).flat()

export const PACK_CARD_POOL = ALL_CARDS

export function getCardById(cardId: string): Card | undefined {
  return ALL_CARDS.find((card) => card.id === cardId)
}

export function getCardsByRarity(rarity: string): Card[] {
  return ALL_CARDS.filter((card) => card.rarity === rarity)
}

export function getRandomCardsFromPool(pool: Card[], count: number): Card[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
