import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/config/database'
import { getPlayerFromRequest } from '@/lib/api/get-player.server'
import { successResponse, errorResponse } from '@/lib/api/error-response.server'
import { registerPlayer, buildPlayerStateById } from '@/lib/modules/players/repository.server'

export async function POST(request: NextRequest) {
  await connectDB()

  const outcome = await getPlayerFromRequest(request)
  if (outcome.errorResponse) return outcome.errorResponse

  try {
    const body = await request.json()
    const { transactionId } = body

    if (!transactionId) {
      return errorResponse('Missing transaction ID', 400)
    }

    const playerId = outcome.player._id.toString()
    await registerPlayer(playerId, transactionId)
    const updatedState = await buildPlayerStateById(playerId)

    return successResponse({
      message: 'Registration successful! Welcome to Idle Raiders.',
      delta: {
        isRegistered: updatedState.isRegistered,
        achievements: updatedState.achievements,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Operation failed'
    return errorResponse(msg)
  }
}
