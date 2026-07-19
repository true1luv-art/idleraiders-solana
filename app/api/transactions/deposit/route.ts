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
import { withAuth, errorResponse, successResponse } from '@/lib/api/auth'
import { enqueueDeposit } from '@/lib/modules/transactions-pending/repository.server'

export async function POST(request: NextRequest) {
  return withAuth(request, async (_playerId, username) => {
    const body = await request.json()
    const { txId, amount, walletAddress } = (body ?? {}) as Record<string, unknown>

    if (typeof txId !== 'string' || !txId.trim()) {
      throw new Error('txId is required')
    }
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1) {
      throw new Error('amount must be an integer >= 1')
    }

    // walletAddress from body; fall back to username for Hive players.
    const wallet = (typeof walletAddress === 'string' && walletAddress.trim())
      ? walletAddress.trim()
      : username

    const result = await enqueueDeposit({ walletAddress: wallet, txId: txId.trim(), amount })

    return {
      status:    'queued',
      jobId:     result.jobId,
      duplicate: result.duplicate,
    }
  })
}
