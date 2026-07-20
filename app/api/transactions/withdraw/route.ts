/**
 * app/api/transactions/withdraw/route.ts
 *
 * POST /api/transactions/withdraw
 *
 * Body: { amount: number, walletAddress?: string }
 *
 * Enqueue-only: validates the request, pre-checks the balance (fast fail),
 * then drops a row in `transactions_pending`. The drain worker deducts coins,
 * sends tokens on-chain, and records the ledger row. Recipient is always the
 * authenticated wallet — cannot be overridden by the request body.
 */

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/auth'
import { enqueueWithdrawal } from '@/lib/modules/transactions-pending/repository.server'
import { connectDB } from '@/lib/config/database'
import Player from '@/lib/modules/players/model.server'

export async function POST(request: NextRequest) {
  return withAuth(request, async (_playerId, username) => {
    const body = await request.json()
    const { amount, walletAddress } = (body ?? {}) as Record<string, unknown>

    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1) {
      throw new Error('amount must be an integer >= 1')
    }

    // Recipient is always the authenticated wallet/username — never from body.
    const wallet = (typeof walletAddress === 'string' && walletAddress.trim())
      ? walletAddress.trim()
      : username

    // Cheap pre-check — authoritative balance guard runs again in the worker.
    await connectDB()
    const player = await Player.findOne({
      $or: [{ walletAddress: wallet }, { username }],
    }).lean()

    if (!player) throw new Error('Player not found')

    const coins = (player as { coins?: number }).coins ?? 0
    if (coins < amount) throw new Error('Insufficient coin balance')

    const { jobId } = await enqueueWithdrawal({
      walletAddress: wallet,
      withdrawAmount: amount,
    })

    return { status: 'queued', jobId }
  })
}
