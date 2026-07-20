import { NextRequest } from 'next/server'
import { errorResponse } from '@/lib/api/error-response.server'

// Storage upgrades via dollars have been removed.
// This endpoint is kept as a stub for backwards compatibility.
export async function POST(_request: NextRequest) {
  return errorResponse('Storage upgrades are not available.', 410)
}
