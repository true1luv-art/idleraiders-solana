import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/config/database'
import { getPlayerFromRequest } from '@/lib/api/get-player.server'
import { successResponse, errorResponse } from '@/lib/api/error-response.server'
import { startMission, startTraining } from '@/lib/modules/missions/repository.server'
import { buildPlayerStateById } from '@/lib/modules/players/repository.server'
import type { TrainingType } from '@/lib/modules/missions/model.server'

const TRAINING_TYPES: readonly TrainingType[] = ['weapons', 'mount', 'merchant']

export async function POST(request: NextRequest) {
  await connectDB()

  const outcome = await getPlayerFromRequest(request)
  if (outcome.errorResponse) return outcome.errorResponse

  try {
    const body = await request.json()
    const { type, dungeonId, missionTypeId, questNumber } = body as {
      type?: TrainingType
      dungeonId?: string
      missionTypeId?: string
      questNumber?: number
    }

    const playerId = outcome.player._id.toString()

    if (type) {
      if (!TRAINING_TYPES.includes(type)) {
        return errorResponse('Invalid training type. Must be weapons, mount, or merchant', 400)
      }

      const result = await startTraining(playerId, type)
      const updatedState = await buildPlayerStateById(playerId)

      return successResponse({
        trainingId: result.mission._id.toString(),
        type,
        totalLuck: result.totalLuck,
        masteryReward: result.masteryReward,
        completesAt: result.completesAt.toISOString(),
        message: 'Training started!',
        delta: {
          energy: updatedState.energy,
          lastCycleUpdate: updatedState.lastCycleUpdate,
          activeMission: updatedState.activeMission,
          missionStats: updatedState.missionStats,
        },
      })
    }

    if (!dungeonId || !missionTypeId) {
      return errorResponse('Missing dungeonId or missionTypeId', 400)
    }

    const result = await startMission(playerId, dungeonId, missionTypeId, { questNumber })
    const updatedState = await buildPlayerStateById(playerId)

    return successResponse({
      ...result,
      message: 'Mission started!',
      delta: {
        energy: updatedState.energy,
        lastCycleUpdate: updatedState.lastCycleUpdate,
        activeMission: updatedState.activeMission,
        missionStats: updatedState.missionStats,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Operation failed'
    return errorResponse(msg)
  }
}
