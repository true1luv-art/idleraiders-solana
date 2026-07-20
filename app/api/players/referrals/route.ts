import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/auth'
import { getReferrals } from '@/lib/modules/players/repository.server'

export async function GET(request: NextRequest) {
  return withAuth(request, async (playerId) => {
    const referrals = await getReferrals(playerId)
    return { referrals }
  })
}
