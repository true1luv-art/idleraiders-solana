/**
 * app/api/transactions/purchase/route.ts
 *
 * POST /api/transactions/purchase
 *
 * Body: { txId: string, amount: number, itemId: string, walletAddress?: string }
 *
 * Enqueue-only: validates the request, then drops a row in
 * `transactions_pending`. The drain worker verifies the on-chain payment,
 * claims the settlement slot, and applies the in-game item effect.
 */

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/config/database'
import { getPlayerFromRequest } from '@/lib/api/get-player.server'
import { successResponse, errorResponse } from '@/lib/api/error-response.server'
import { enqueuePurchase } from '@/lib/modules/transactions-pending/repository.server'

const VALID_ITEMS = new Set(['card_pack'])

export async function POST(request: NextRequest) {
  await connectDB()

  const outcome = await getPlayerFromRequest(request)
  if (outcome.errorResponse) return outcome.errorResponse

  try {
    const { username } = outcome
    const body = await request.json()
    const { txId, amount, itemId, walletAddress } = (body ?? {}) as Record<string, unknown>

    if (typeof txId !== 'string' || !txId.trim()) {
      return errorResponse('txId is required', 400)
    }
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1) {
      return errorResponse('amount must be an integer >= 1', 400)
    }
    if (typeof itemId !== 'string' || !VALID_ITEMS.has(itemId)) {
      return errorResponse(`itemId must be one of: ${[...VALID_ITEMS].join(', ')}`, 400)
    }

    const wallet = (typeof walletAddress === 'string' && walletAddress.trim())
      ? walletAddress.trim()
      : username

    const result = await enqueuePurchase({
      walletAddress: wallet,
      txId:          txId.trim(),
      amount,
      itemId,
    })

    return successResponse({
      status:    'queued',
      jobId:     result.jobId,
      duplicate: result.duplicate,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Operation failed'
    return errorResponse(msg)
  }
}
