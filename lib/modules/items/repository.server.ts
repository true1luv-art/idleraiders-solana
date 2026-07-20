/**
 * lib/modules/items/repository.server.ts
 *
 * Server-side repository for item operations: packs and potions.
 * Canonical location — all item logic lives here.
 */
import type { Types } from 'mongoose'
import * as playerRepo from '../players/repository.server'
import * as cardRepo from '../cards/repository.server'
import { addCardWithDetails, type AddCardResult } from '../cards/repository.server'
import GAME_DATA from '@/public/data'
import * as historyService from '../histories/repository.server'
import type { LogEventPayload } from '../histories/repository.server'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface GameCard {
  id: string
  name?: string
  rarity?: string
  type?: string
  cost?: number
  supply?: { max?: number }
  boost?: { percent?: number }
}

interface GamePack {
  id: string
  name?: string
  buy?: { coins?: number }
  data?: {
    dropRates: Record<string, number>
    guaranteedRarity?: string
    cardCount?: number
  }
}

interface SystemConfig {
  ENERGY?: { MAX: number }
}

interface GameItem {
  id: string
  name?: string
  category?: string
  catergory?: string // typo in original data
}

// Hard cap: a single purchase-and-open is limited to 10 packs.
const MAX_PACKS_PER_OPEN = 10

export interface BuyAndOpenPacksResult {
  cards: GameCard[]
  packId: string
  quantity: number
  totalCost: number
  currencyType: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const _gd = GAME_DATA as unknown as { SYSTEM?: SystemConfig; ITEMS?: GameItem[]; CARDS?: GameCard[] }
const ENERGY_MAX = (_gd.SYSTEM?.ENERGY?.MAX ?? 100)
const ITEMS_ARRAY = (_gd.ITEMS ?? []) as GameItem[]
const CARDS_ARRAY = (_gd.CARDS ?? []) as GameCard[]

const PACKS_BY_ID = Object.fromEntries(
  ITEMS_ARRAY.filter((item) => item?.catergory === 'pack' || item?.category === 'pack').map((item) => [item.id, item])
) as Record<string, GamePack>

// Only heroes enter the pack roll pool — equipment/mounts/artifacts are
// preserved in GAME_DATA but excluded from drops until further notice.
const CARDS_BY_RARITY = CARDS_ARRAY.filter((card) => card?.type === 'hero').reduce((acc, card) => {
  if (!card?.rarity) return acc
  if (!acc[card.rarity]) acc[card.rarity] = []
  acc[card.rarity].push(card)
  return acc
}, {} as Record<string, GameCard[]>)

const PACK_FALLBACK_CARD = CARDS_ARRAY[0]

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

async function getPlayerOrThrow(playerId: string | Types.ObjectId) {
  const player = await playerRepo.findById(playerId.toString())
  if (!player) throw new Error('Player not found')
  return player
}

async function logHistorySafe(payload: LogEventPayload): Promise<void> {
  try {
    await historyService.logEvent(payload)
  } catch (error) {
    console.warn('[ItemRepository] history log skipped:', (error as Error).message)
  }
}

function rollCardRarity(dropRates: Record<string, number>, guaranteedRarity: string | null = null): string {
  if (guaranteedRarity) return guaranteedRarity
  const r = Math.random()
  let cumulative = 0
  for (const [rarity, rate] of Object.entries(dropRates)) {
    cumulative += rate
    if (r < cumulative) return rarity
  }
  return 'common'
}

async function rollPackCard(rarity: string, supplyMap: Record<string, number> = {}): Promise<GameCard> {
  const pool = CARDS_BY_RARITY[rarity] ?? []
  if (pool.length === 0) return PACK_FALLBACK_CARD

  const availableCards = pool.filter((card) => {
    const maxSupply = card.supply?.max ?? Infinity
    const currentSupply = supplyMap[card.id] ?? 0
    return currentSupply < maxSupply
  })

  if (availableCards.length === 0) {
    for (const otherRarity of Object.keys(CARDS_BY_RARITY)) {
      if (otherRarity === rarity) continue
      const otherAvailable = (CARDS_BY_RARITY[otherRarity] ?? []).filter((card) => {
        const maxSupply = card.supply?.max ?? Infinity
        return (supplyMap[card.id] ?? 0) < maxSupply
      })
      if (otherAvailable.length > 0) {
        return otherAvailable[Math.floor(Math.random() * otherAvailable.length)]
      }
    }
    return PACK_FALLBACK_CARD
  }

  return availableCards[Math.floor(Math.random() * availableCards.length)]
}

// ═══════════════════════════════════════════════════════════════════════════════
// Potion API — operates on player.potions (embedded on Player doc)
// ═══════════════════════════════════════════════════════════════════════════════

export async function usePotion(
  playerId: string | Types.ObjectId,
  type: string
): Promise<{ energy?: number; expBoostActive?: boolean }> {
  const player = await getPlayerOrThrow(playerId)

  if (type === 'energy_potion') {
    if ((player.potions?.energy ?? 0) <= 0) throw new Error('No energy potions available')
    await playerRepo.updateById(player._id.toString(), {
      $inc: { 'potions.energy': -1 },
      energy: ENERGY_MAX,
      lastCycleUpdate: new Date(),
    })
    return { energy: ENERGY_MAX }
  }

  if (type === 'exp_potion') {
    if ((player.potions?.xp ?? 0) <= 0) throw new Error('No XP potions available')
    if (player.missionStats?.isExpBoostActive) throw new Error('EXP boost is already active')
    await playerRepo.updateById(player._id.toString(), {
      $inc: { 'potions.xp': -1 },
      'missionStats.isExpBoostActive': true,
    })
    return { expBoostActive: true }
  }

  throw new Error(`Unknown potion type: ${type}`)
}

/**
 * Add potions directly to the player document.
 * Enforces storageSlots cap across both potion types combined.
 */
export async function addPotion(
  playerId: string | Types.ObjectId,
  type: 'energy_potion' | 'exp_potion',
  quantity: number = 1
): Promise<void> {
  const player = await getPlayerOrThrow(playerId)
  const storageSlots = player.storageSlots ?? 3
  const currentTotal = (player.potions?.energy ?? 0) + (player.potions?.xp ?? 0)
  const available = Math.max(0, storageSlots - currentTotal)
  const toAdd = Math.min(quantity, available)
  if (toAdd <= 0) return

  const field = type === 'energy_potion' ? 'potions.energy' : 'potions.xp'
  await playerRepo.updateById(player._id.toString(), { $inc: { [field]: toAdd } })
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pack API — buy a pack and immediately mint cards (no intermediate storage)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Purchase `quantity` (max 10) packs and immediately roll + mint all cards.
 */
export async function buyAndOpenPacks(
  playerId: string | Types.ObjectId,
  packId: string,
  quantity: number,
  paymentMethod: string
): Promise<BuyAndOpenPacksResult> {
  const qty = Math.max(1, Math.min(Math.floor(quantity), MAX_PACKS_PER_OPEN))

  const player = await getPlayerOrThrow(playerId)
  const pack = PACKS_BY_ID[packId] as GamePack | undefined
  if (!pack) throw new Error('Pack not found')
  if (!pack.data) throw new Error('Pack has no card data configured')

  // ── Cost validation ────────────────────────────────────────────────────────
  let totalCost = 0
  const currencyType = 'token'
  const updateData: Record<string, number> = {}

  if (paymentMethod === 'coins' || paymentMethod === 'token') {
    const tokenCost = (pack.buy?.coins ?? 0) * qty
    if ((player.coins ?? 0) < tokenCost) throw new Error('Not enough Realm Coins')
    updateData.coins = (player.coins ?? 0) - tokenCost
    totalCost = tokenCost
  } else {
    throw new Error('Invalid payment method — only coins are accepted')
  }

  await playerRepo.updateById(player._id.toString(), updateData)

  // ── Roll cards ─────────────────────────────────────────────────────────────
  const supplyData = await cardRepo.getTotalSupplyAggregation()
  const supplyMap: Record<string, number> = {}
  supplyData.forEach((item: { _id: string; supply: number }) => {
    supplyMap[item._id] = item.supply
  })

  const allCards: GameCard[] = []
  for (let p = 0; p < qty; p++) {
    const guaranteedRarity = rollCardRarity(pack.data.dropRates, pack.data.guaranteedRarity ?? null)
    const first = await rollPackCard(guaranteedRarity, supplyMap)
    allCards.push(first)
    supplyMap[first.id] = (supplyMap[first.id] ?? 0) + 1
    for (let i = 1; i < (pack.data.cardCount ?? 1); i++) {
      const rarity = rollCardRarity(pack.data.dropRates)
      const next = await rollPackCard(rarity, supplyMap)
      allCards.push(next)
      supplyMap[next.id] = (supplyMap[next.id] ?? 0) + 1
    }
  }

  // ── Mint cards ─────────────────────────────────────────────────────────────
  const cardResults: (AddCardResult & { error?: string })[] = []
  for (const card of allCards) {
    try {
      const result = await addCardWithDetails(playerId, card as Parameters<typeof addCardWithDetails>[1], 'pack')
      cardResults.push(result)
    } catch (error) {
      console.error(`[ItemRepository] Failed to add card ${card.id}:`, (error as Error).message)
      cardResults.push({
        card: null as any,
        previousCount: 0,
        currentCount: 0,
        isNew: false,
        error: (error as Error).message,
      })
    }
  }

  const successfulCards = cardResults.filter((r) => !r.error)

  // ── Update milestones ──────────────────────────────────────────────────────
  const milestones = (player.milestones as unknown as Record<string, number>) ?? {}
  milestones.totalOpenedPacks = (milestones.totalOpenedPacks ?? 0) + qty
  milestones.totalCardsCollected = (milestones.totalCardsCollected ?? 0) + successfulCards.length
  await playerRepo.updateById(player._id.toString(), { milestones })

  // ── History ────────────────────────────────────────────────────────────────
  await logHistorySafe({
    playerId: player._id,
    source: 'packs',
    eventType: 'packs',
    eventKey: 'packs.buy_and_open',
    metadata: {
      packId,
      packName: pack.name,
      quantity: qty,
      totalCost,
      currencyType,
      paymentMethod,
      cards: cardResults.map((result, i) => ({
        cardId: allCards[i].id,
        name: allCards[i].name,
        rarity: allCards[i].rarity,
        type: allCards[i].type,
        previousCount: result.previousCount,
        currentCount: result.currentCount,
        isNew: result.isNew,
        ...(result.error && { error: result.error, failed: true }),
      })),
      cardsCount: allCards.length,
      cardsAdded: successfulCards.length,
      cardsFailed: cardResults.filter((r) => r.error).length,
      target: {
        entityType: 'pack',
        entityId: packId,
        label: pack.name ?? packId,
      },
    },
  })

  // ── Discord notifications ──────────────────────────────────────────────────
  import('@/lib/config/discord').then(({ notifyPackOpening, notifyTavernEvent }) => {
    notifyPackOpening({
      playerName: player.username,
      packName: pack.name ?? packId,
      packId,
      cardsObtained: allCards.map((card) => ({
        name: card.name ?? card.id,
        rarity: card.rarity ?? 'common',
        type: card.type ?? 'unknown',
      })),
      remainingPacks: 0,
    }).catch(() => {})

    const legendaryCards = allCards.filter(
      (card) => card.rarity?.toLowerCase() === 'legendary' || card.rarity?.toLowerCase() === 'mythic'
    )
    for (const card of legendaryCards) {
      notifyTavernEvent({
        eventType: 'legendary_pull',
        playerName: player.username,
        cardName: card.name ?? card.id,
        cardRarity: card.rarity ?? 'legendary',
        packName: pack.name ?? packId,
      }).catch(() => {})
    }
  }).catch(() => {})

  return { cards: allCards, packId, quantity: qty, totalCost, currencyType }
}
