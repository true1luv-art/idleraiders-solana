/**
 * app/api/transactions/deposit/route.ts
 *
 * POST /api/transactions/deposit
 *
 * Body: { txId: string, amount: number }
 *
 * Enqueue-only: validates the request cheaply, then drops a row in
 * `transactions_pending`. The drain worker verifies the on-chain transfer,
 * credits coins, and records the ledger row. The client polls
 * GET /api/transactions to detect settlement.
 */

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/config/database'
import { getPlayerFromRequest } from '@/lib/api/get-player.server'
import { successResponse, errorResponse } from '@/lib/api/error-response.server'
import { enqueueDeposit } from '@/lib/modules/transactions-pending/repository.server'

export async function POST(request: NextRequest) {
  await connectDB()

  const outcome = await getPlayerFromRequest(request)
  if (outcome.errorResponse) return outcome.errorResponse

  try {
    const { username } = outcome
    const body = await request.json()
    const { txId, amount, walletAddress } = (body ?? {}) as Record<string, unknown>

    if (typeof txId !== 'string' || !txId.trim()) {
      return errorResponse('txId is required', 400)
    }
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1) {
      return errorResponse('amount must be an integer >= 1', 400)
    }

    // walletAddress from body; fall back to username for Hive players.
    const wallet = (typeof walletAddress === 'string' && walletAddress.trim())
      ? walletAddress.trim()
      : username

    const result = await enqueueDeposit({ walletAddress: wallet, txId: txId.trim(), amount })

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
