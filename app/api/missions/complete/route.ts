import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/config/database'
import { getPlayerFromRequest } from '@/lib/api/get-player.server'
import { successResponse, errorResponse } from '@/lib/api/error-response.server'
import { completeMission } from '@/lib/modules/missions/repository.server'
import { buildPlayerStateById } from '@/lib/modules/players/repository.server'

export async function POST(request: NextRequest) {
  await connectDB()

  const outcome = await getPlayerFromRequest(request)
  if (outcome.errorResponse) return outcome.errorResponse

  try {
    const body = await request.json()
    const { missionId } = body

    if (!missionId) {
      return errorResponse('Missing missionId', 400)
    }

    const playerId = outcome.player._id.toString()
    const result = await completeMission(playerId, missionId)
    const updatedState = await buildPlayerStateById(playerId)

    // If mission was already completed or not found, return cleared response (no rewards)
    if ('cleared' in result && result.cleared) {
      return successResponse({
        cleared: true,
        message: 'Mission cleared - no rewards (already completed or not found)',
        delta: {
          activeMission: updatedState.activeMission,
        },
      })
    }

    return successResponse({
      ...result,
      message: 'Mission completed!',
      delta: {
        coins: updatedState.coins,
        level: updatedState.level,
        xp: updatedState.xp,
        xpToNextLevel: updatedState.xpToNextLevel,
        energy: updatedState.energy,
        lastCycleUpdate: updatedState.lastCycleUpdate,
        missionStats: updatedState.missionStats,
        milestones: updatedState.milestones,
        activeMission: updatedState.activeMission,
        cards: updatedState.cards,
        potions: updatedState.potions,
        achievements: updatedState.achievements,
        dailyDungeonStats: updatedState.dailyDungeonStats,
        stats: updatedState.stats,
        totalMissions: updatedState.totalMissions,
        totalBossDamage: updatedState.totalBossDamage,
        totalMinutesPlayed: updatedState.totalMinutesPlayed,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Operation failed'
    return errorResponse(msg)
  }
}
