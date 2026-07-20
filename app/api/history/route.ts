import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/config/database'
import { getPlayerFromRequest } from '@/lib/api/get-player.server'
import { successResponse, errorResponse } from '@/lib/api/error-response.server'
import { getHistory } from '@/lib/modules/histories/history.service'

export async function GET(request: NextRequest) {
  await connectDB()

  const outcome = await getPlayerFromRequest(request)
  if (outcome.errorResponse) return outcome.errorResponse

  try {
    const { searchParams } = new URL(request.url)
    const eventType = searchParams.get('eventType') || undefined
    const source = searchParams.get('source') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const result = await getHistory(outcome.player._id.toString(), { eventType, source, limit })

    return successResponse({ history: result.entries, total: result.total })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Operation failed'
    return errorResponse(msg)
  }
}
