/**
 * app/api/transactions/route.ts
 *
 * GET /api/transactions?limit=25&cursor=<processedAt>&type=deposit|withdrawal|purchase
 *
 * Paginated settlement history for the authenticated player, newest-first.
 * Reads from `transactions_processed`.
 * Clients poll this after enqueuing to detect settlement.
 */

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/config/database'
import { getPlayerFromRequest } from '@/lib/api/get-player.server'
import { successResponse, errorResponse } from '@/lib/api/error-response.server'
import { getTransactionHistory } from '@/lib/modules/transactions-processed/repository.server'
import type { ProcessedTxType } from '@/lib/modules/transactions-processed/types.server'

const DEFAULT_LIMIT = 25
const MAX_LIMIT     = 25
const VALID_TYPES: ProcessedTxType[] = ['deposit', 'withdrawal', 'purchase']

export async function GET(request: NextRequest) {
  await connectDB()

  const outcome = await getPlayerFromRequest(request)
  if (outcome.errorResponse) return outcome.errorResponse

  try {
    const { username } = outcome

    const url = new URL(request.url)

    const rawLimit = Number(url.searchParams.get('limit'))
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT

    const rawCursor = url.searchParams.get('cursor')
    const cursor = rawCursor != null && Number.isFinite(Number(rawCursor))
      ? Number(rawCursor)
      : undefined

    const rawType = url.searchParams.get('type')
    const type = rawType && VALID_TYPES.includes(rawType as ProcessedTxType)
      ? (rawType as ProcessedTxType)
      : undefined

    const { transactions, nextCursor } = await getTransactionHistory(
      username,
      limit,
      cursor,
      type,
    )

    return successResponse({ transactions, nextCursor })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Operation failed'
    return errorResponse(msg)
  }
}
