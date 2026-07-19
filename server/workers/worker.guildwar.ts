/**
 * Guild War Worker
 * Cron-based worker for guild war economy tasks.
 * No BullMQ or Redis — uses simple in-process flags to prevent duplicate runs.
 *
 * Handles:
 * - Hourly supply generation for guilds holding outposts
 * - Expired buff cleanup every 5 minutes
 */

import cron from 'node-cron'
import * as guildwarService from '../../lib/modules/guildwars/guildwar.service'
import * as guildwarRepo from '../../lib/modules/guildwars/guildwar.repository'

// ═══════════════════════════════════════════════════════════════════════════════
// In-process lock flags
// ═══════════════════════════════════════════════════════════════════════════════

let supplyRunning = false
let buffCleanupRunning = false

// ═══════════════════════════════════════════════════════════════════════════════
// Worker Instances
// ═══════════════════════════════════════════════════════════════════════════════

let supplyGenerationCron: ReturnType<typeof cron.schedule> | null = null
let buffCleanupCron: ReturnType<typeof cron.schedule> | null = null

// ═══════════════════════════════════════════════════════════════════════════════
// Supply Generation
// ═══════════════════════════════════════════════════════════════════════════════

async function processHourlySupplyGeneration(): Promise<void> {
  if (supplyRunning) {
    console.log('[idleraiders-logs] Supply generation already running, skipping')
    return
  }

  supplyRunning = true

  try {
    console.log('[idleraiders-logs] Processing hourly supply generation...')

    const activeWar = await guildwarRepo.findActive()
    if (!activeWar) {
      console.log('[idleraiders-logs] No active guild war, skipping supply generation')
      return
    }

    const result = await guildwarService.generateHourlySupplies()
    console.log(
      `[idleraiders-logs] Supply generation complete: ${result.totalSupplies} supplies to ${result.guildsAwarded} guilds`,
    )
  } catch (error) {
    console.error('[idleraiders-logs] Error in supply generation:', error)
  } finally {
    supplyRunning = false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Buff Cleanup
// ═══════════════════════════════════════════════════════════════════════════════

async function processBuffCleanup(): Promise<void> {
  if (buffCleanupRunning) {
    console.log('[idleraiders-logs] Buff cleanup already running, skipping')
    return
  }

  buffCleanupRunning = true

  try {
    console.log('[idleraiders-logs] Processing buff cleanup...')

    const activeWar = await guildwarRepo.findActive()
    if (!activeWar) {
      console.log('[idleraiders-logs] No active guild war, skipping buff cleanup')
      return
    }

    await guildwarRepo.removeExpiredBuffs()
    console.log('[idleraiders-logs] Buff cleanup complete')
  } catch (error) {
    console.error('[idleraiders-logs] Error in buff cleanup:', error)
  } finally {
    buffCleanupRunning = false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Worker Initialization
// ═══════════════════════════════════════════════════════════════════════════════

export function initializeGuildWarWorker(): void {
  console.log('[idleraiders-logs] Starting guild war worker...')

  // Hourly supply generation — minute 0 of every hour
  supplyGenerationCron = cron.schedule('0 * * * *', async () => {
    await processHourlySupplyGeneration()
  })

  // Buff cleanup — every 5 minutes
  buffCleanupCron = cron.schedule('*/5 * * * *', async () => {
    await processBuffCleanup()
  })

  console.log(
    '[idleraiders-logs] Guild war worker started (supply generation: hourly, buff cleanup: every 5 min)',
  )
}

export function stopGuildWarWorker(): void {
  if (supplyGenerationCron) {
    supplyGenerationCron.stop()
    supplyGenerationCron = null
  }

  if (buffCleanupCron) {
    buffCleanupCron.stop()
    buffCleanupCron = null
  }

  console.log('[idleraiders-logs] Stopped guild war worker')
}

export async function triggerSupplyGenerationManually(): Promise<{
  success: boolean
  guildsAwarded: number
  totalSupplies: number
}> {
  console.log('[idleraiders-logs] Manual trigger - generating supplies')

  try {
    const result = await guildwarService.generateHourlySupplies()
    return {
      success: true,
      guildsAwarded: result.guildsAwarded,
      totalSupplies: result.totalSupplies,
    }
  } catch (error) {
    console.error('[idleraiders-logs] Error in manual supply generation:', error)
    return {
      success: false,
      guildsAwarded: 0,
      totalSupplies: 0,
    }
  }
}

export function getGuildWarWorkerStatus(): {
  isRunning: boolean
  supplyGenerationActive: boolean
  buffCleanupActive: boolean
} {
  return {
    isRunning: supplyGenerationCron !== null || buffCleanupCron !== null,
    supplyGenerationActive: supplyGenerationCron !== null,
    buffCleanupActive: buffCleanupCron !== null,
  }
}
