import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/config/database'
import { getPlayerFromRequest } from '@/lib/api/get-player.server'
import { successResponse, errorResponse } from '@/lib/api/error-response.server'
import { getEnergy } from '@/lib/modules/players/repository.server'

export async function POST(request: NextRequest) {
  await connectDB()

  const outcome = await getPlayerFromRequest(request)
  if (outcome.errorResponse) return outcome.errorResponse

  try {
    const result = await getEnergy(outcome.player._id.toString())
    return successResponse({
      message: 'Energy regenerated!',
      delta: {
        energy: result.energy,
        maxEnergy: result.maxEnergy,
        lastCycleUpdate: result.lastCycleUpdate,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Operation failed'
    return errorResponse(msg)
  }
}
