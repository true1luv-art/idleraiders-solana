import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/auth'
import { enqueuePurchase } from '@/lib/modules/transactions-pending/repository.server'
import Player from '@/lib/modules/players/player.model'
import { connectDB } from '@/lib/config/database'

export async function POST(request: NextRequest) {
  return withAuth(request, async (_playerId, username) => {
    await connectDB()

    const body = await request.json()
    const { transactionId } = body

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: 'Missing blockchain transaction ID' },
        { status: 400 },
      )
    }

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

    const pending = await enqueuePurchase({
      txHash: transactionId,
      username,
      amount: 0,
      symbol: 'HIVE',
      memo: `registration:${username}:ref=${player.referredBy || 'idleraiders'}`,
    })

    return NextResponse.json({ success: true, pendingId: pending._id })
  })
}
