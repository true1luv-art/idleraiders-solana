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
import { withAuth } from '@/lib/api/auth'
import { enqueuePurchase } from '@/lib/modules/transactions-pending/repository.server'

const VALID_ITEMS = new Set(['card_pack'])

export async function POST(request: NextRequest) {
  return withAuth(request, async (_playerId, username) => {
    const body = await request.json()
    const { txId, amount, itemId, walletAddress } = (body ?? {}) as Record<string, unknown>

    if (typeof txId !== 'string' || !txId.trim()) {
      throw new Error('txId is required')
    }
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1) {
      throw new Error('amount must be an integer >= 1')
    }
    if (typeof itemId !== 'string' || !VALID_ITEMS.has(itemId)) {
      throw new Error(`itemId must be one of: ${[...VALID_ITEMS].join(', ')}`)
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

    return {
      status:    'queued',
      jobId:     result.jobId,
      duplicate: result.duplicate,
    }
  })
}
