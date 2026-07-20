import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/config/database'
import { getPlayerFromRequest } from '@/lib/api/get-player.server'
import { successResponse, errorResponse } from '@/lib/api/error-response.server'
import { usePotion } from '@/lib/modules/items/item.service'
import { buildPlayerStateById } from '@/lib/modules/players/repository.server'

/**
 * POST /api/items/potion
 *
 * Use a potion from the player's embedded potions field.
 * Body: { type: 'energy_potion' | 'exp_potion' }
 */
export async function POST(request: NextRequest) {
  await connectDB()

  const outcome = await getPlayerFromRequest(request)
  if (outcome.errorResponse) return outcome.errorResponse

  try {
    const body = await request.json()
    const { type } = body

    if (!type) {
      return errorResponse('Missing potion type', 400)
    }

    const playerId = outcome.player._id.toString()
    const result = await usePotion(playerId, type)
    const updatedState = await buildPlayerStateById(playerId)

    return successResponse({
      ...result,
      message: 'Potion used!',
      delta: {
        energy: updatedState.energy,
        lastCycleUpdate: updatedState.lastCycleUpdate,
        missionStats: updatedState.missionStats,
        potions: updatedState.potions,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Operation failed'
    return errorResponse(msg)
  }
}
