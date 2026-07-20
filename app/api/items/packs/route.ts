import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/auth'
import { buyAndOpenPacks } from '@/lib/modules/items/item.service'
import { buildPlayerStateById } from '@/lib/modules/players/repository.server'

/**
 * POST /api/items/packs
 *
 * Buy and immediately open packs — no intermediate inventory storage.
 * Follows the boom-miner direct-mint pattern: coins are deducted and cards
 * are minted in one atomic flow, max 10 packs per request.
 *
 * Body: { packId: string, quantity?: number, paymentMethod?: string }
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (playerId) => {
    const body = await request.json()
    const { packId, quantity, paymentMethod } = body as {
      packId?: string
      quantity?: number
      paymentMethod?: string
    }

    if (!packId) {
      throw new Error('Missing packId')
    }

    // Clamp quantity: minimum 1, maximum 10
    const qty =
      typeof quantity === 'number' && Number.isFinite(quantity) && quantity >= 1
        ? Math.min(Math.floor(quantity), 10)
        : 1

    const result = await buyAndOpenPacks(playerId, packId, qty, paymentMethod ?? 'coins')
    const updatedState = await buildPlayerStateById(playerId)

    return {
      ...result,
      message: qty > 1 ? `${qty} packs opened!` : 'Pack opened!',
      delta: {
        cards: updatedState.cards,
        coins: updatedState.coins,
        stats: updatedState.stats,
        achievements: updatedState.achievements,
      },
    }
  })
}
