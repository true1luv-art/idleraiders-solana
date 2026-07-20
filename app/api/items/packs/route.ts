import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/config/database'
import { getPlayerFromRequest } from '@/lib/api/get-player.server'
import { successResponse, errorResponse } from '@/lib/api/error-response.server'
import { buyAndOpenPacks } from '@/lib/modules/items/repository.server'
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
  await connectDB()

  const outcome = await getPlayerFromRequest(request)
  if (outcome.errorResponse) return outcome.errorResponse

  try {
    const body = await request.json()
    const { packId, quantity, paymentMethod } = body as {
      packId?: string
      quantity?: number
      paymentMethod?: string
    }

    if (!packId) {
      return errorResponse('Missing packId', 400)
    }

    const qty =
      typeof quantity === 'number' && Number.isFinite(quantity) && quantity >= 1
        ? Math.min(Math.floor(quantity), 10)
        : 1

    const playerId = outcome.player._id.toString()
    const result = await buyAndOpenPacks(playerId, packId, qty, paymentMethod ?? 'coins')
    const updatedState = await buildPlayerStateById(playerId)

    return successResponse({
      ...result,
      message: qty > 1 ? `${qty} packs opened!` : 'Pack opened!',
      delta: {
        cards: updatedState.cards,
        coins: updatedState.coins,
        stats: updatedState.stats,
        achievements: updatedState.achievements,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Operation failed'
    return errorResponse(msg)
  }
}
