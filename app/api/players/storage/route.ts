import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/auth'

// Storage upgrades via dollars have been removed.
// This endpoint is kept as a stub for backwards compatibility.
export async function POST(request: NextRequest) {
  return withAuth(request, async () => {
    return NextResponse.json({ success: false, error: 'Storage upgrades are not available.' }, { status: 410 })
  })
}
