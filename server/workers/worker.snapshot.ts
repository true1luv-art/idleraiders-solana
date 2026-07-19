/**
 * Weekly Snapshot Worker
 * Cron-based worker for weekly leaderboard finalization.
 * No BullMQ or Redis — uses a simple in-process lock flag to prevent duplicate runs.
 *
 * Orchestrates:
 * - Leaderboard finalization (computing final ranks)
 * - Reward distribution (shards to players, points to guilds)
 * - Starting fresh for new week
 */

import cron from 'node-cron'
import { getCurrentWeek } from '../../lib/modules/leaderboards/leaderboard.logic'
import {
  finalizeWeeklyLeaderboard,
  rewardsDistributedForWeek,
} from '../../lib/modules/leaderboards/leaderboard.service'
import * as leaderboardRepo from '../../lib/modules/leaderboards/leaderboard.repository'
import * as guildwarService from '../../lib/modules/guildwars/guildwar.service'
import * as guildwarRepo from '../../lib/modules/guildwars/guildwar.repository'

// ═══════════════════════════════════════════════════════════════════════════════
// In-process lock
// ═══════════════════════════════════════════════════════════════════════════════

const processingWeeks = new Set<number>()

// ═══════════════════════════════════════════════════════════════════════════════
// Worker Instance
// ═══════════════════════════════════════════════════════════════════════════════

let cronTask: ReturnType<typeof cron.schedule> | null = null

// ═══════════════════════════════════════════════════════════════════════════════
// Snapshot Processor
// ═══════════════════════════════════════════════════════════════════════════════

export interface SnapshotResult {
  success: boolean
  weekNumber: number
  leaderboardSnapshotsCreated: number
  rewardsDistributed: {
    playerCount: number
    totalShards: number
    guildCount: number
    totalGuildShards: number
  }
  warSeasonFinalized: boolean
  warRewardsDistributed: {
    guildCount: number
    totalPointsDistributed: number
  }
  error?: string
}

/**
 * Process the weekly snapshot directly (no queue, no external lock).
 * Uses an in-process Set to prevent duplicate processing within a single server run.
 */
export async function processWeeklySnapshot(
  weekNumber: number,
  triggeredBy: 'cron' | 'manual' = 'cron',
): Promise<SnapshotResult> {
  if (processingWeeks.has(weekNumber)) {
    console.log(
      `[idleraiders-logs] Snapshot for week ${weekNumber} already in progress, skipping`,
    )
    return {
      success: true,
      weekNumber,
      leaderboardSnapshotsCreated: 0,
      rewardsDistributed: { playerCount: 0, totalShards: 0, guildCount: 0, totalGuildShards: 0 },
      warSeasonFinalized: false,
      warRewardsDistributed: { guildCount: 0, totalPointsDistributed: 0 },
    }
  }

  processingWeeks.add(weekNumber)

  try {
    console.log(
      `[idleraiders-logs] Processing weekly snapshot for week ${weekNumber} (triggered by: ${triggeredBy})`,
    )

    // Idempotency check
    const alreadyDistributed = await rewardsDistributedForWeek(weekNumber)
    if (alreadyDistributed) {
      console.log(
        `[idleraiders-logs] Rewards already distributed for week ${weekNumber}, skipping`,
      )
      return {
        success: true,
        weekNumber,
        leaderboardSnapshotsCreated: 0,
        rewardsDistributed: { playerCount: 0, totalShards: 0, guildCount: 0, totalGuildShards: 0 },
        warSeasonFinalized: false,
        warRewardsDistributed: { guildCount: 0, totalPointsDistributed: 0 },
      }
    }

    const activeLeaderboard = await leaderboardRepo.findActive()
    const activeGuildWar = await guildwarRepo.findActiveByWeek(weekNumber)

    if (!activeLeaderboard && !activeGuildWar) {
      console.log(
        `[idleraiders-logs] No active leaderboard or guild war found for week ${weekNumber}`,
      )
      return {
        success: true,
        weekNumber,
        leaderboardSnapshotsCreated: 0,
        rewardsDistributed: { playerCount: 0, totalShards: 0, guildCount: 0, totalGuildShards: 0 },
        warSeasonFinalized: false,
        warRewardsDistributed: { guildCount: 0, totalPointsDistributed: 0 },
      }
    }

    const isManual = triggeredBy === 'manual'
    let leaderboardResult = {
      playerRewards: { count: 0, totalShards: 0 },
      guildRewards: { count: 0, totalShards: 0 },
    }
    let warSeasonResult = { count: 0, totalPointsDistributed: 0 }

    // 1. Finalize leaderboard (if exists)
    if (activeLeaderboard) {
      console.log(`[idleraiders-logs] Step 1: Finalizing leaderboard and distributing rewards...`)
      const { rewardsDistributed } = await finalizeWeeklyLeaderboard(weekNumber, isManual)
      leaderboardResult = rewardsDistributed
    }

    // 2. Finalize guild war (if exists)
    if (activeGuildWar) {
      console.log(`[idleraiders-logs] Step 2: Finalizing guild war and distributing war rewards...`)
      try {
        const { rewardsDistributed } = await guildwarService.finalizeGuildWar(weekNumber)
        warSeasonResult = rewardsDistributed
      } catch (error) {
        console.error(`[idleraiders-logs] Error finalizing guild war:`, error)
      }
    }

    console.log(`[idleraiders-logs] Week ${weekNumber} snapshot processing complete`)

    return {
      success: true,
      weekNumber,
      leaderboardSnapshotsCreated: activeLeaderboard ? 1 : 0,
      rewardsDistributed: {
        playerCount: leaderboardResult.playerRewards.count,
        totalShards: leaderboardResult.playerRewards.totalShards,
        guildCount: leaderboardResult.guildRewards.count,
        totalGuildShards: leaderboardResult.guildRewards.totalShards,
      },
      warSeasonFinalized: !!activeGuildWar,
      warRewardsDistributed: warSeasonResult,
    }
  } catch (error) {
    console.error(`[idleraiders-logs] Error processing snapshot for week ${weekNumber}:`, error)
    return {
      success: false,
      weekNumber,
      leaderboardSnapshotsCreated: 0,
      rewardsDistributed: { playerCount: 0, totalShards: 0, guildCount: 0, totalGuildShards: 0 },
      warSeasonFinalized: false,
      warRewardsDistributed: { guildCount: 0, totalPointsDistributed: 0 },
      error: (error as Error).message,
    }
  } finally {
    processingWeeks.delete(weekNumber)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Worker Initialization
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize the snapshot cron scheduler
 */
export function initializeSnapshotWorker(): void {
  console.log('[idleraiders-logs] Starting weekly snapshot worker (cron)...')

  // Runs every Sunday 16:00 UTC (= Monday 00:00 UTC+8)
  cronTask = cron.schedule('1 16 * * 0', async () => {
    console.log('[idleraiders-logs] Cron triggered - running weekly snapshot')
    const { weekNumber } = getCurrentWeek()
    const previousWeekNumber = weekNumber - 1

    // 1. Finalize previous week
    await processWeeklySnapshot(previousWeekNumber, 'cron')

    // 2. Start new week's guild war
    try {
      console.log(`[idleraiders-logs] Starting new guild war for week ${weekNumber}...`)
      await guildwarService.getOrCreateCurrentGuildWar()
      console.log(`[idleraiders-logs] Guild war for week ${weekNumber} created successfully`)
    } catch (error) {
      console.error(`[idleraiders-logs] Error creating guild war for week ${weekNumber}:`, error)
    }
  })

  console.log('[idleraiders-logs] Weekly snapshot worker started (cron scheduler)')
}

/**
 * Stop the snapshot cron
 */
export async function stopSnapshotWorker(): Promise<void> {
  if (cronTask) {
    cronTask.stop()
    cronTask = null
  }
  console.log('[idleraiders-logs] Stopped snapshot worker')
}

/**
 * Manually trigger snapshot for the current week
 */
export async function triggerSnapshotCreationManually(): Promise<void> {
  console.log('[idleraiders-logs] Manual trigger - running snapshot')
  const { weekNumber } = getCurrentWeek()
  await processWeeklySnapshot(weekNumber, 'manual')
}

/**
 * Manually start a guild war for the current week
 */
export async function startGuildWarManually(): Promise<{
  success: boolean
  weekNumber: number
  message: string
}> {
  const { weekNumber } = getCurrentWeek()
  console.log(`[idleraiders-logs] Manual trigger - starting guild war for week ${weekNumber}`)

  try {
    const existingWar = await guildwarRepo.findActiveByWeek(weekNumber)
    if (existingWar) {
      return {
        success: true,
        weekNumber,
        message: `Guild war for week ${weekNumber} already exists`,
      }
    }

    const guildWar = await guildwarService.getOrCreateCurrentGuildWar()
    console.log(`[idleraiders-logs] Guild war for week ${weekNumber} created successfully`)

    return {
      success: true,
      weekNumber,
      message: `Guild war for week ${weekNumber} created with ${guildWar.outposts.length} outposts`,
    }
  } catch (error) {
    console.error(`[idleraiders-logs] Error creating guild war:`, error)
    return {
      success: false,
      weekNumber,
      message: (error as Error).message,
    }
  }
}

/**
 * Get snapshot worker status
 */
export function getSnapshotWorkerStatus(): {
  isRunning: boolean
  currentWeek: number
} {
  const { weekNumber } = getCurrentWeek()
  return {
    isRunning: cronTask !== null,
    currentWeek: weekNumber,
  }
}
