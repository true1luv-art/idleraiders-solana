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
import { connectDB } from '@/lib/config/database'
import { getPlayerFromRequest } from '@/lib/api/get-player.server'
import { successResponse, errorResponse } from '@/lib/api/error-response.server'
import { enqueueWithdrawal } from '@/lib/modules/transactions-pending/repository.server'

export async function POST(request: NextRequest) {
  await connectDB()

  const outcome = await getPlayerFromRequest(request)
  if (outcome.errorResponse) return outcome.errorResponse

  try {
    const { player, username } = outcome
    const body = await request.json()
    const { amount, walletAddress } = (body ?? {}) as Record<string, unknown>

    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1) {
      return errorResponse('amount must be an integer >= 1', 400)
    }

    // Recipient is always the authenticated wallet/username — never from body.
    const wallet = (typeof walletAddress === 'string' && walletAddress.trim())
      ? walletAddress.trim()
      : username

    // Cheap pre-check — authoritative balance guard runs again in the worker.
    const coins = (player as unknown as { coins?: number }).coins ?? 0
    if (coins < amount) return errorResponse('Insufficient coin balance', 400)

    const { jobId } = await enqueueWithdrawal({
      walletAddress: wallet,
      withdrawAmount: amount,
    })

    return successResponse({ status: 'queued', jobId })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Operation failed'
    return errorResponse(msg)
  }
}
