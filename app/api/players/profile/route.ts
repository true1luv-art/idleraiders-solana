import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/config/database'
import * as playerRepo from '@/lib/modules/players/repository.server'
import * as cardRepo from '@/lib/modules/cards/repository.server'
import { xpToNextLevel } from '@/lib/modules/players/player.logic'
import { applyBoostCap } from '@/lib/modules/players/repository.server'
import { CARDS_BY_ID } from '@/lib/registries/card.registry'
import { RARITY_MULTIPLIERS } from '@/public/data/cards/cardConfig'

/**
 * GET /api/players/profile?username=xxx
 * Returns public profile data for a player by username
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json(
        { success: false, message: 'Username is required' },
        { status: 400 }
      )
    }

    // Find the player
    const player = await playerRepo.findByUsernameLean(username)
    if (!player) {
      return NextResponse.json(
        { success: false, message: 'Player not found' },
        { status: 404 }
      )
    }

    const playerId = (player as unknown as { _id: string })._id

    // Get cards for stat calculation. Stats are NOT persisted on the card
    // documents — they live on the static CARDS_BY_ID registry and are
    // multiplied by the card's owned quantity. This mirrors the logic in
    // `lib/modules/players/player.builder.ts`.
    const cards = await cardRepo.findByOwner(playerId)

    let totalRaidPower = 0
    let totalMastery = 0
    let totalLuck = 0
    let totalCards = 0
    const rawBoosts = { expBoost: 0, energyBoost: 0 }

    for (const card of cards) {
      const qty = card.quantity ?? 1
      totalCards += qty
      const def = CARDS_BY_ID[card.cardId] ?? {}
      const stats = (def as { stats?: { raidPower?: number; mastery?: number; luck?: number } }).stats ?? {}

      if (def.type === 'booster' && def.class && def.rarity) {
        // Booster cards contribute only to boost types (xpBoost, energyBoost)
        const pct = RARITY_MULTIPLIERS[(def.rarity as string)] ?? 0
        const amount = pct * qty
        if (def.class === 'xpBoost') rawBoosts.expBoost += amount
        else if (def.class === 'energyBoost') rawBoosts.energyBoost += amount
      } else {
        totalRaidPower += (stats.raidPower ?? 0) * qty
        totalMastery += (stats.mastery ?? 0) * qty
        totalLuck += (stats.luck ?? 0) * qty
      }
    }
    const uniqueCards = cards.length

    // Apply the same diminishing-returns cap used for the viewing player
    const boosts = {
      expBoost: applyBoostCap(rawBoosts.expBoost),
      energyBoost: applyBoostCap(rawBoosts.energyBoost),
    }

    // Milestones live on a nested subdoc — pull totals from there
    const milestones = (player.milestones ?? {}) as Record<string, number>
    const level = player.level ?? 1

    // Return public profile data
    return NextResponse.json({
      success: true,
      profile: {
        username: player.username,
        avatar: (player as unknown as { avatar?: string }).avatar ?? '⚔️',
        level,
        xp: player.xp ?? 0,
        xpToNextLevel: xpToNextLevel(level),
        coins: player.coins ?? 0,
        totalMissions: milestones.totalMissionsCompleted ?? 0,
        totalBossDamage: milestones.totalBossDamage ?? 0,
        totalMinutesPlayed: milestones.totalMinutesPlayed ?? 0,
        joinedAt: player.createdAt ? new Date(player.createdAt).getTime() : Date.now(),
        // Computed stats
        raidPower: totalRaidPower,
        mastery: totalMastery,
        luck: totalLuck,
        totalCards,
        uniqueCards,
        // Effective (post-cap) boost percentages from booster cards
        boosts,
      },
    })
  } catch (error) {
    console.error('[API] Error fetching player profile:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
