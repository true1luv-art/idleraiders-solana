/**
 * lib/modules/cards/repository.server.ts
 *
 * Single server-side entry point for all card DB operations and business logic.
 * Merges: card.repository.ts + card.service.ts
 *
 * SERVER-ONLY — never import this from client components.
 */

import Card, {
  type ICard,
  type ICardDocument,
  type CardRarity,
  type CardType,
} from './model.server'
import type { UpdateQuery, QueryOptions, Types, PipelineStage } from 'mongoose'
import mongoose from 'mongoose'
type FilterQuery<T> = mongoose.QueryFilter<T>
import { CARDS_BY_ID as _CARDS_BY_ID } from '@/lib/registries/card.registry'
import GAME_DATA from '@/public/data'

// Re-export CARDS_BY_ID so importers of card.service can get it from here
export { _CARDS_BY_ID as CARDS_BY_ID }

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateCardData {
  owner: Types.ObjectId | string
  cardId: string
  rarity?: CardRarity
  type?: CardType
  class?: string
  quantity?: number
  source?: string
}

export interface CardWithDefinition extends ICard {
  name?: string
  description?: string
  imageUrl?: string
  lore?: string
  stats?: Record<string, number>
  tradeable?: boolean
}

export interface AddCardResult {
  card: ICardDocument
  previousCount: number
  currentCount: number
  isNew: boolean
}

interface OwnerCardAggregation {
  totalCards: number
  uniqueCards: number
  byRarity: Record<CardRarity, number>
  byType: Record<CardType, number>
}

interface GameCard {
  id: string
  name?: string
  class?: string
  rarity?: CardRarity
  type?: CardType
  cost?: number
  [key: string]: unknown
}

// ═══════════════════════════════════════════════════════════════════════════════
// Internal CARDS_BY_ID fallback (from GAME_DATA if registry is empty)
// ═══════════════════════════════════════════════════════════════════════════════

const _gameCardsArray = ((GAME_DATA as unknown as { CARDS?: GameCard[] }).CARDS ?? []) as GameCard[]
const _gameCardsById = Object.fromEntries(_gameCardsArray.map((c) => [c.id, c])) as Record<string, GameCard>

function getCardDef(cardId: string): GameCard | undefined {
  return (_CARDS_BY_ID as Record<string, GameCard>)[cardId] ?? _gameCardsById[cardId]
}

// ═══════════════════════════════════════════════════════════════════════════════
// Repository — DB reads/writes (matching original card.repository.ts API)
// ═══════════════════════════════════════════════════════════════════════════════

export async function create(data: CreateCardData): Promise<ICardDocument> {
  return Card.create(data)
}

export async function findById(id: string | Types.ObjectId): Promise<ICardDocument | null> {
  return Card.findById(id)
}

export async function findOne(filter: FilterQuery<ICard>): Promise<ICardDocument | null> {
  return Card.findOne(filter)
}

export async function findMany(
  filter: FilterQuery<ICard> = {},
  options: QueryOptions = {},
): Promise<ICardDocument[]> {
  return Card.find(filter, null, options)
}

export async function findByOwner(owner: Types.ObjectId | string): Promise<ICardDocument[]> {
  return Card.find({ owner })
}

export async function findByOwnerLean(ownerId: string | Types.ObjectId): Promise<ICard[]> {
  return Card.find({ owner: ownerId }).lean()
}

export async function findByOwnerAndCardId(
  owner: Types.ObjectId | string,
  cardId: string,
): Promise<ICardDocument | null> {
  return Card.findOne({ owner, cardId })
}

export async function findByOwnerAndType(
  owner: Types.ObjectId | string,
  type: CardType,
): Promise<ICardDocument[]> {
  return Card.find({ owner, type })
}

export async function findByOwnerAndRarity(
  owner: Types.ObjectId | string,
  rarity: CardRarity,
): Promise<ICardDocument[]> {
  return Card.find({ owner, rarity })
}

export async function updateById(
  id: string | Types.ObjectId,
  update: UpdateQuery<ICard>,
  options: QueryOptions = { returnDocument: 'after' },
): Promise<ICardDocument | null> {
  return Card.findByIdAndUpdate(id, update, options)
}

export async function deleteById(id: string | Types.ObjectId): Promise<ICardDocument | null> {
  return Card.findByIdAndDelete(id)
}

export async function deleteByOwner(ownerId: string | Types.ObjectId): Promise<number> {
  const result = await Card.deleteMany({ owner: ownerId })
  return result.deletedCount ?? 0
}

export async function countByOwner(ownerId: string | Types.ObjectId): Promise<number> {
  return Card.countDocuments({ owner: ownerId })
}

export async function decrementQuantity(
  owner: Types.ObjectId | string,
  cardId: string,
  quantity = 1,
): Promise<ICardDocument | null> {
  return Card.findOneAndUpdate(
    { owner, cardId },
    { $inc: { quantity: -quantity } },
    { returnDocument: 'after' },
  )
}

export async function upsertCard(
  ownerId: string | Types.ObjectId,
  cardId: string,
  data: Partial<CreateCardData>,
): Promise<ICardDocument> {
  const existing = await findByOwnerAndCardId(ownerId, cardId)
  if (existing) {
    existing.quantity = (existing.quantity ?? 1) + (data.quantity ?? 1)
    return existing.save()
  }
  return Card.create({ owner: ownerId, cardId, quantity: 1, ...data })
}

export async function getOwnerCardAggregation(owner: Types.ObjectId | string): Promise<OwnerCardAggregation> {
  const pipeline: PipelineStage[] = [
    { $match: { owner } },
    {
      $group: {
        _id: null,
        totalCards: { $sum: '$quantity' },
        uniqueCards: { $sum: 1 },
        byRarity: { $push: { rarity: '$rarity', quantity: '$quantity' } },
        byType: { $push: { type: '$type', quantity: '$quantity' } },
      },
    },
  ]
  const [result] = await Card.aggregate(pipeline)
  if (!result) return { totalCards: 0, uniqueCards: 0, byRarity: {} as Record<CardRarity, number>, byType: {} as Record<CardType, number> }

  const byRarity: Record<string, number> = {}
  for (const item of result.byRarity) {
    byRarity[item.rarity] = (byRarity[item.rarity] ?? 0) + item.quantity
  }
  const byType: Record<string, number> = {}
  for (const item of result.byType) {
    byType[item.type] = (byType[item.type] ?? 0) + item.quantity
  }

  return {
    totalCards: result.totalCards,
    uniqueCards: result.uniqueCards,
    byRarity: byRarity as Record<CardRarity, number>,
    byType: byType as Record<CardType, number>,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Service — business logic (from card.service.ts)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getCards(ownerId: string | Types.ObjectId): Promise<ICardDocument[]> {
  return findByOwner(ownerId)
}

export async function getCardsByType(ownerId: string | Types.ObjectId, type: CardType): Promise<ICardDocument[]> {
  return findByOwnerAndType(ownerId, type)
}

export async function getCardsByRarity(ownerId: string | Types.ObjectId, rarity: CardRarity): Promise<ICardDocument[]> {
  return findByOwnerAndRarity(ownerId, rarity)
}

export async function getCollectionStats(ownerId: string | Types.ObjectId): Promise<OwnerCardAggregation> {
  return getOwnerCardAggregation(ownerId)
}

export async function getCardsWithDefinitions(ownerId: string | Types.ObjectId): Promise<CardWithDefinition[]> {
  const dbCards = await findByOwnerLean(ownerId)
  return dbCards.map((card) => {
    const def = getCardDef(card.cardId) ?? {}
    return { ...card, ...(def as object) }
  })
}

export async function addCard(
  ownerId: string | Types.ObjectId,
  card: GameCard | string,
  _source?: string,
): Promise<ICardDocument | null> {
  const cardDef = typeof card === 'string' ? getCardDef(card) : card
  if (!cardDef) throw new Error(`Card not found: ${card}`)
  const rarity = cardDef.rarity ?? 'common'
  const type = cardDef.type ?? 'hero'
  const cardClass = cardDef.class
  return upsertCard(ownerId, cardDef.id, { rarity, type, class: cardClass, quantity: 1 })
}

export async function addCardWithDetails(
  ownerId: string | Types.ObjectId,
  card: GameCard | string,
  _source?: string,
): Promise<AddCardResult> {
  const cardDef = typeof card === 'string' ? getCardDef(card) : card
  if (!cardDef) throw new Error(`Card not found: ${card}`)
  const rarity = cardDef.rarity ?? 'common'
  const type = cardDef.type ?? 'hero'
  const cardClass = cardDef.class

  const existing = await findByOwnerAndCardId(ownerId, cardDef.id)
  const previousCount = existing?.quantity ?? 0
  const isNew = !existing

  const updatedCard = await upsertCard(ownerId, cardDef.id, { rarity, type, class: cardClass, quantity: 1 })
  if (!updatedCard) throw new Error('Failed to add card')

  return { card: updatedCard, previousCount, currentCount: updatedCard.quantity, isNew }
}

export async function addCards(
  ownerId: string | Types.ObjectId,
  cards: (GameCard | string)[],
): Promise<ICardDocument[]> {
  const results: ICardDocument[] = []
  for (const card of cards) {
    const added = await addCard(ownerId, card)
    if (added) results.push(added)
  }
  return results
}

export async function awardCard(
  ownerId: string | Types.ObjectId,
  cardId: string,
  source = 'system',
  quantity = 1,
): Promise<ICardDocument> {
  const def = getCardDef(cardId)
  if (!def) throw new Error(`Unknown card: ${cardId}`)
  const existing = await findByOwnerAndCardId(ownerId, cardId)
  if (existing) {
    existing.quantity = (existing.quantity ?? 1) + quantity
    return existing.save()
  }
  // `source` is caller metadata only — not persisted on the card document
  return Card.create({
    owner: ownerId,
    cardId,
    rarity: def.rarity as CardRarity ?? 'common',
    type: def.type as CardType ?? 'hero',
    quantity,
  })
}

export async function removeCard(
  ownerId: string | Types.ObjectId,
  cardId: string,
  quantity = 1,
): Promise<ICardDocument | null> {
  const card = await findByOwnerAndCardId(ownerId, cardId)
  if (!card) throw new Error('Card not found')
  if ((card.quantity ?? 1) < quantity) throw new Error('Not enough cards')
  if ((card.quantity ?? 1) === quantity) {
    await card.deleteOne()
    return null
  }
  return decrementQuantity(ownerId, cardId, quantity)
}

export async function transferCard(
  fromOwnerId: string | Types.ObjectId,
  toOwnerId: string | Types.ObjectId,
  cardId: string,
  quantity = 1,
): Promise<{ fromCard: ICardDocument | null; toCard: ICardDocument | null }> {
  const cardDef = getCardDef(cardId)
  if (!cardDef) throw new Error('Card not found')
  const fromCard = await removeCard(fromOwnerId, cardId, quantity)
  const toCard = await upsertCard(toOwnerId, cardId, {
    rarity: cardDef.rarity ?? 'common',
    type: cardDef.type ?? 'hero',
    class: cardDef.class,
    quantity,
  })
  return { fromCard, toCard }
}

/**
 * Aggregates total minted supply per cardId across all players.
 * Used by the /api/cards/supply route to compute availability.
 */
export async function getTotalSupplyAggregation(): Promise<{ _id: string; supply: number }[]> {
  const results = await Card.aggregate<{ _id: string; supply: number }>([
    { $group: { _id: '$cardId', supply: { $sum: '$quantity' } } },
  ])
  return results
}

/**
 * Returns all cards owned by a player that were sourced from a specific territory.
 * Story card IDs follow the pattern: story_t1_q1, story_t2_q3, etc.
 */
export async function getPlayerCardsByTerritory(
  ownerId: string | Types.ObjectId,
  territoryId: string,
): Promise<ICardDocument[]> {
  const allCards = await findByOwner(ownerId)
  return allCards.filter((card) => {
    if (!card.cardId.startsWith('story_')) return false
    const parts = card.cardId.split('_')
    return parts.length >= 2 && parts[1] === territoryId
  })
}
