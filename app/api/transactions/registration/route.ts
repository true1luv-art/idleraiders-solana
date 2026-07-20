import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/auth'
import Player from '@/lib/modules/players/player.model'
import { connectDB } from '@/lib/config/database'

/**
 * POST /api/transactions/registration
 *
 * Free registration — no payment required.
 * Marks the player as registered immediately.
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (_playerId, username) => {
    await connectDB()

    const player = await Player.findOne({ username })
    if (!player) {
      return NextResponse.json({ success: false, error: 'Player not found' }, { status: 404 })
    }

    if (player.isRegistered) {
      return NextResponse.json(
        { success: false, error: 'Player already registered' },
        { status: 409 },
      )
    }

    player.isRegistered = true
    await player.save()

    return NextResponse.json({ success: true })
  })
}
