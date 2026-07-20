import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/config/database'
import { getPlayerFromRequest } from '@/lib/api/get-player.server'
import { successResponse, errorResponse } from '@/lib/api/error-response.server'
import { attackBoss } from '@/lib/modules/missions/repository.server'
import { buildPlayerStateById } from '@/lib/modules/players/repository.server'

export async function POST(request: NextRequest) {
  await connectDB()

  const outcome = await getPlayerFromRequest(request)
  if (outcome.errorResponse) return outcome.errorResponse

  try {
    const body = await request.json()
    const { bossId, raidPower } = body

    if (!bossId) {
      return errorResponse('Missing bossId', 400)
    }

    const playerId = outcome.player._id.toString()
    const result = await attackBoss(playerId, bossId, raidPower || 100)
    const updatedState = await buildPlayerStateById(playerId)

    return successResponse({
      ...result,
      message: 'Boss attacked!',
      delta: {
        coins: updatedState.coins,
        missionStats: updatedState.missionStats,
        milestones: updatedState.milestones,
        achievements: updatedState.achievements,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Operation failed'
    return errorResponse(msg)
  }
}
