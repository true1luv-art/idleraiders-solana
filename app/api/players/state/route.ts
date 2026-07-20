import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/config/database'
import { getPlayerFromRequest } from '@/lib/api/get-player.server'
import { successResponse, errorResponse } from '@/lib/api/error-response.server'
import { buildPlayerStateById } from '@/lib/modules/players/repository.server'

export async function GET(request: NextRequest) {
  await connectDB()

  const outcome = await getPlayerFromRequest(request)
  if (outcome.errorResponse) return outcome.errorResponse

  try {
    const playerState = await buildPlayerStateById(outcome.player._id.toString())
    return successResponse({ playerState })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Operation failed'
    return errorResponse(msg)
  }
}
