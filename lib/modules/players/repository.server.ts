/**
 * lib/modules/players/repository.server.ts
 *
 * Single server-side entry point for all player DB operations and business logic.
 * Merges: player.repository.ts + player.service.ts + player.builder.ts
 *
 * SERVER-ONLY — never import this from client components.
 */

import Player, { type IPlayer, type IPlayerDocument } from './model.server'
import type { FilterQuery, UpdateQuery, QueryOptions, Types } from 'mongoose'
import { xpToNextLevel, getXPForLevel } from './logic'
import { getManilaDateString } from '@/lib/utils/time'
import { CARDS_BY_ID } from '@/lib/registries/card.registry'
import GAME_DATA from '@/public/data'
import type { GameData } from '@/lib/types'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreatePlayerData {
  username: string
  isRegistered?: boolean
  referredBy?: string
  coins?: number
  energy?: number
  level?: number
  xp?: number
}

interface LoginResult {
  player: IPlayerDocument
  isNew: boolean
}

interface EnergyResult {
  energy: number
  maxEnergy: number
  regeneratedEnergy: number
  lastCycleUpdate: Date
}

interface ReferralInfo {
  username: string
  isRegistered: boolean
}

// Combined card-derived values
export interface RawCardValues {
  raidPower: number
  mastery: number
  luck: number
  energyBoost?: number
}

interface Stats {
  raidPower: number
  mastery: number
  luck: number
}

interface Boosts {
  expBoost: number
  energyBoost: number
}

interface SerializedMission {
  id: string
  type: string
  sourceName: string
  missionLabel: string
  startTime: number
  duration: number
  completedAt: number | null
}

interface CardItem {
  id: string
  cardId: string
  rarity: string
  type: string
  quantity: number
  name: string
  description: string
  source: string | null
  stats: Record<string, number>
}

interface Achievement {
  id: string
  name: string
  description: string
  icon?: string
  category?: string
  unlocked: boolean
}

export interface PlayerState {
  username: string
  isRegistered: boolean
  level: number
  xp: number
  xpToNextLevel: number
  coins: number
  energy: number
  storageSlots: number
  lastCycleUpdate: Date
  referredBy: string
  missionStats: { fatigue: number; mastery: number; isExpBoostActive: boolean }
  dailyDungeonStats: Record<string, number>
  boosts: Boosts
  milestones: Record<string, unknown>
  activeMission: SerializedMission | null
  joinedAt: Date | null
  totalMissions: number
  totalBossDamage: number
  totalMinutesPlayed: number
  stats: Stats
  cards: CardItem[]
  potions: { energy: number; xp: number }
  achievements: Achievement[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants (from player.service.ts)
// ═══════════════════════════════════════════════════════════════════════════════

interface SystemConfig {
  ENERGY?: { MAX: number; REGEN_INTERVAL: number; PER_TICK: number }
}

const SYSTEM = (GAME_DATA as { SYSTEM?: SystemConfig }).SYSTEM ?? {}
const ENERGY_CONFIG = SYSTEM.ENERGY ?? { MAX: 100, REGEN_INTERVAL: 900, PER_TICK: 5 }
const ENERGY = {
  MAX: ENERGY_CONFIG.MAX,
  REGEN_RATE: ENERGY_CONFIG.PER_TICK,
  CYCLE_INTERVAL_MS: ENERGY_CONFIG.REGEN_INTERVAL * 1000,
}
const MAX_LEVEL = 150

// ═══════════════════════════════════════════════════════════════════════════════
// Repository — DB reads/writes
// ═══════════════════════════════════════════════════════════════════════════════

export async function create(data: CreatePlayerData): Promise<IPlayerDocument> {
  return Player.create(data)
}

export async function findById(id: string | Types.ObjectId): Promise<IPlayerDocument | null> {
  return Player.findById(id)
}

export async function findByIdLean(id: string | Types.ObjectId): Promise<IPlayer | null> {
  return Player.findById(id).lean()
}

export async function findByIds(ids: (string | Types.ObjectId)[]): Promise<IPlayerDocument[]> {
  return Player.find({ _id: { $in: ids } })
}

export async function findByUsername(username: string): Promise<IPlayerDocument | null> {
  return Player.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } })
}

// Alias used by auth helpers and route handlers
export const findPlayerByUsername = findByUsername

export async function findByUsernameLean(username: string): Promise<IPlayer | null> {
  return Player.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } }).lean()
}

export async function findOne(filter: FilterQuery<IPlayer>): Promise<IPlayerDocument | null> {
  return Player.findOne(filter)
}

export async function findMany(
  filter: FilterQuery<IPlayer> = {},
  options: QueryOptions = {},
): Promise<IPlayerDocument[]> {
  return Player.find(filter, null, options)
}

export async function findRegistered(limit = 100): Promise<IPlayerDocument[]> {
  return Player.find({ isRegistered: true }).limit(limit)
}

export async function updateById(
  id: string | Types.ObjectId,
  update: UpdateQuery<IPlayer>,
  options: QueryOptions = { returnDocument: 'after' },
): Promise<IPlayerDocument | null> {
  return Player.findByIdAndUpdate(id, update, options)
}

export async function updateByUsername(
  username: string,
  update: UpdateQuery<IPlayer>,
  options: QueryOptions = { returnDocument: 'after' },
): Promise<IPlayerDocument | null> {
  return Player.findOneAndUpdate(
    { username: { $regex: new RegExp(`^${username}$`, 'i') } },
    update,
    options,
  )
}

export async function incrementField(
  id: string | Types.ObjectId,
  field: string,
  amount: number,
): Promise<IPlayerDocument | null> {
  return Player.findByIdAndUpdate(id, { $inc: { [field]: amount } }, { returnDocument: 'after' })
}

export async function setActiveMission(
  playerId: string | Types.ObjectId,
  missionId: Types.ObjectId | null,
): Promise<IPlayerDocument | null> {
  return Player.findByIdAndUpdate(playerId, { activeMission: missionId }, { returnDocument: 'after' })
}

export async function clearActiveMission(playerId: string | Types.ObjectId): Promise<IPlayerDocument | null> {
  return setActiveMission(playerId, null)
}

export async function deleteById(id: string | Types.ObjectId): Promise<IPlayerDocument | null> {
  return Player.findByIdAndDelete(id)
}

export async function deleteByUsername(username: string): Promise<IPlayerDocument | null> {
  return Player.findOneAndDelete({ username: { $regex: new RegExp(`^${username}$`, 'i') } })
}

export async function count(filter: FilterQuery<IPlayer> = {}): Promise<number> {
  return Player.countDocuments(filter)
}

export async function countRegistered(): Promise<number> {
  return Player.countDocuments({ isRegistered: true })
}

export async function deductEnergy(
  playerId: string | Types.ObjectId,
  amount: number,
): Promise<IPlayerDocument | null> {
  return Player.findByIdAndUpdate(
    playerId,
    { $inc: { energy: -amount } },
    { returnDocument: 'after' },
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Builder helpers (from player.builder.ts)
// ═══════════════════════════════════════════════════════════════════════════════

export function applyBoostCap(rawPercent: number): number {
  if (rawPercent <= 0) return 0
  if (rawPercent <= 75) return rawPercent
  const overflow = rawPercent - 75
  return Math.min(150, 75 + 75 * Math.sqrt(overflow / 75))
}

export async function getRawCardBoostsById(playerId: string | Types.ObjectId): Promise<RawCardValues> {
  // Lazy import to avoid circular dependency — cards imports players
  const { default: Card } = await import('../cards/model.server')
  const dbCards = await Card.find({ owner: playerId }).lean()
  const raw: RawCardValues = { raidPower: 0, mastery: 0, luck: 0, energyBoost: 0 }
  for (const card of dbCards) {
    const cardDef = CARDS_BY_ID[(card as { cardId: string }).cardId] ?? {}
    const qty = (card as { quantity?: number }).quantity ?? 1
    raw.raidPower += (cardDef.stats?.raidPower ?? 0) * qty
    raw.mastery += (cardDef.stats?.mastery ?? 0) * qty
    raw.luck += (cardDef.stats?.luck ?? 0) * qty
  }
  return raw
}

function getMissionLabel(type: string): string {
  switch (type) {
    case 'dungeon': return 'Dungeon Run'
    case 'story': return 'Story Quest'
    case 'boss': return 'Boss Raid'
    default: return 'Mission'
  }
}

function serializeActiveMission(mission: Record<string, unknown> | null): SerializedMission | null {
  if (!mission) return null
  const missionId = (mission._id as { toString?: () => string })?.toString?.() ?? null
  const startTime = mission.startTime instanceof Date ? mission.startTime.getTime() : Number(mission.startTime)
  const duration = Number(mission.duration)
  if (!missionId || !Number.isFinite(startTime) || !Number.isFinite(duration)) return null
  return {
    id: missionId,
    type: (mission.type as string) ?? 'dungeon',
    sourceName: (mission.sourceName as string) ?? 'Mission',
    missionLabel: getMissionLabel((mission.type as string) ?? 'dungeon'),
    startTime,
    duration,
    completedAt:
      mission.completedAt instanceof Date ? mission.completedAt.getTime() : ((mission.completedAt as number | null) ?? null),
  }
}

export async function buildPlayerState(player: IPlayerDocument): Promise<PlayerState> {
  const { default: Card } = await import('../cards/model.server')
  const { default: Mission } = await import('../missions/model.server')

  const rawActiveMission = player.activeMission
  const isPopulated =
    rawActiveMission && typeof rawActiveMission === 'object' && '_id' in rawActiveMission
  const activeMissionId = isPopulated
    ? (rawActiveMission as { _id: Types.ObjectId })._id
    : (rawActiveMission ?? null)
  const shouldLoadActiveMission = !!activeMissionId && !isPopulated

  const [dbCards, activeMissionDoc] = await Promise.all([
    Card.find({ owner: player._id }).lean(),
    shouldLoadActiveMission ? Mission.findById(activeMissionId).lean() : null,
  ])

  const missionToSerialize = isPopulated
    ? (rawActiveMission as Record<string, unknown>)
    : (activeMissionDoc as Record<string, unknown> | null)
  const activeMission = serializeActiveMission(missionToSerialize)

  const potions = { energy: player.potions?.energy ?? 0, xp: player.potions?.xp ?? 0 }
  const stats: Stats = { raidPower: 0, mastery: 0, luck: 0 }

  const cards: CardItem[] = (dbCards as Array<{ cardId: string; rarity: string; type: string; quantity?: number; source?: string }>).map((dbCard) => {
    const cardDef = CARDS_BY_ID[dbCard.cardId] ?? {}
    const s = cardDef.stats ?? {}
    const qty = dbCard.quantity ?? 1
    stats.raidPower += (s.raidPower || 0) * qty
    stats.mastery += (s.mastery || 0) * qty
    stats.luck += (s.luck || 0) * qty
    return {
      id: dbCard.cardId,
      cardId: dbCard.cardId,
      rarity: dbCard.rarity,
      type: dbCard.type,
      quantity: qty,
      name: cardDef.name ?? dbCard.cardId,
      description: cardDef.description ?? '',
      source: dbCard.source ?? null,
      stats: s as Record<string, number>,
    }
  })

  const boosts: Boosts = { expBoost: 0, energyBoost: 0 }

  const rawMilestones = (player.milestones ?? {}) as Record<string, unknown>
  const rawMC = rawMilestones.missionCompletions
  const missionCompletionsObj =
    rawMC instanceof Map ? Object.fromEntries(rawMC) : ((rawMC as Record<string, number> | undefined) ?? {})
  const milestones: Record<string, unknown> = { ...rawMilestones, missionCompletions: missionCompletionsObj }

  interface AchStats {
    totalMissions: number; totalBossDamage: number; raidPower: number; uniqueCards: number
    coins: number; playerLevel: number; territoriesCompleted: number; totalTerritories: number; minutesPlayed: number
  }
  const achStats: AchStats = {
    totalMissions: (milestones.totalMissionsCompleted as number) ?? 0,
    totalBossDamage: (milestones.totalBossDamage as number) ?? 0,
    raidPower: stats.raidPower,
    uniqueCards: dbCards.length,
    coins: player.coins ?? 0,
    playerLevel: player.level ?? 1,
    territoriesCompleted: (milestones.storyProgress as number) ?? 0,
    totalTerritories: (GAME_DATA as { WORLD?: { TERRITORIES?: unknown[] } }).WORLD?.TERRITORIES?.length ?? 0,
    minutesPlayed: (milestones.totalMinutesPlayed as number) ?? 0,
  }

  interface ProgressionAchievement {
    id: string; name: string; title?: string; description: string; icon?: string
    check?: (stats: AchStats) => boolean; rewards?: unknown
  }
  const progressionAchievements = (
    (GAME_DATA as GameData & { PROGRESSION?: { ACHIEVEMENTS?: ProgressionAchievement[] } })
      .PROGRESSION?.ACHIEVEMENTS ?? []
  ) as ProgressionAchievement[]

  const achievements: Achievement[] = progressionAchievements.map((a) => {
    const { check, title, rewards: _r, ...rest } = a
    return { ...rest, name: title ?? rest.name ?? a.id, unlocked: typeof check === 'function' ? check(achStats) : false }
  })

  const rawRuns =
    player.dailyDungeonStats?.runs instanceof Map ? Object.fromEntries(player.dailyDungeonStats.runs) : {}
  const lastReset = player.dailyDungeonStats?.lastReset
  const todayManila = getManilaDateString(new Date())
  const lastResetManila = lastReset ? getManilaDateString(new Date(lastReset)) : null
  const dailyDungeonStatsObj = lastResetManila === todayManila ? rawRuns : {}

  return {
    username: player.username,
    isRegistered: player.isRegistered ?? false,
    level: player.level ?? 1,
    xp: player.xp ?? 0,
    xpToNextLevel: xpToNextLevel(player.level ?? 1),
    coins: player.coins ?? 0,
    energy: player.energy ?? 0,
    storageSlots: player.storageSlots ?? 3,
    lastCycleUpdate: player.lastCycleUpdate,
    referredBy: player.referredBy ?? 'idleraiders',
    missionStats: player.missionStats ?? { fatigue: 0, mastery: 0, isExpBoostActive: false },
    dailyDungeonStats: dailyDungeonStatsObj,
    boosts,
    milestones,
    activeMission,
    joinedAt: player.createdAt ?? null,
    totalMissions: (milestones.totalMissionsCompleted as number) ?? 0,
    totalBossDamage: (milestones.totalBossDamage as number) ?? 0,
    totalMinutesPlayed: (milestones.totalMinutesPlayed as number) ?? 0,
    stats,
    cards,
    potions,
    achievements,
  }
}

export async function buildPlayerStateById(playerId: string | Types.ObjectId): Promise<PlayerState> {
  if (!playerId) throw new Error('Player ID is required')
  const player = await Player.findById(playerId).populate('activeMission')
  if (!player) throw new Error('Player not found')
  return buildPlayerState(player)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Service — business logic (from player.service.ts)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getPlayerOrThrow(playerId: string | Types.ObjectId): Promise<IPlayerDocument> {
  const player = await findById(playerId)
  if (!player) throw new Error('Player not found')
  return player
}

async function logHistorySafe(payload: Record<string, unknown>): Promise<void> {
  try {
    const { logEvent } = await import('../histories/history.service')
    await logEvent(payload as Parameters<typeof logEvent>[0])
  } catch (error) {
    console.warn('[idleraiders-logs] history log skipped:', (error as Error).message)
  }
}

export async function loginPlayer(
  username: string,
  signature: string,
  referral = '',
): Promise<LoginResult> {
  console.log('[idleraiders-logs] loginPlayer signature:', signature?.slice(0, 20))
  let player = await findByUsername(username)
  let isNew = false
  if (!player) {
    player = await create({ username, referredBy: referral || 'idleraiders' })
    isNew = true
    await logHistorySafe({ playerId: player._id, source: 'auth', eventType: 'login', eventKey: 'auth.login', metadata: { isNew, referral } })
  }
  return { player, isNew }
}

export async function registerPlayer(
  playerId: string | Types.ObjectId,
  registrationData: Record<string, unknown> = {},
): Promise<IPlayerDocument> {
  const player = await getPlayerOrThrow(playerId)
  if (player.isRegistered) throw new Error('Player already registered')
  player.isRegistered = true
  await player.save()
  await logHistorySafe({ playerId: player._id, source: 'auth', eventType: 'registration', eventKey: 'auth.registration', metadata: registrationData })
  import('@/lib/config/discord').then(({ notifyRegistration }) => {
    notifyRegistration({ playerName: player.username, playerId: player._id.toString() }).catch(() => {})
  }).catch(() => {})
  return player
}

export async function getReferrals(playerId: string | Types.ObjectId): Promise<ReferralInfo[]> {
  const player = await getPlayerOrThrow(playerId)
  const referred = await Player.find({ referredBy: player.username }, 'username isRegistered').lean()
  return referred.map((r) => ({ username: r.username, isRegistered: r.isRegistered }))
}

export async function getPlayerData(username: string): Promise<IPlayerDocument> {
  const player = await Player.findOne({ username }).populate('activeMission')
  if (!player) throw new Error('Player not found')
  return player
}

export async function addXp(
  playerId: string | Types.ObjectId,
  amount: number,
  playerDoc?: IPlayerDocument | null,
): Promise<{ player: IPlayerDocument; levelsGained: number; xpAdded: number }> {
  const player = playerDoc ?? (await getPlayerOrThrow(playerId))
  let levelsGained = 0
  player.xp = (player.xp ?? 0) + amount
  while (player.level < MAX_LEVEL && player.xp >= getXPForLevel(player.level)) {
    player.xp -= getXPForLevel(player.level)
    player.level += 1
    levelsGained += 1
  }
  await player.save()
  return { player, levelsGained, xpAdded: amount }
}

export async function updateCoins(playerId: string | Types.ObjectId, amount: number): Promise<IPlayerDocument> {
  const player = await getPlayerOrThrow(playerId)
  player.coins = Math.max(0, (player.coins ?? 0) + amount)
  await player.save()
  return player
}

export async function getEnergy(playerId: string | Types.ObjectId): Promise<EnergyResult> {
  const player = await getPlayerOrThrow(playerId)
  const now = Date.now()
  const cycleBase = player.lastCycleUpdate?.getTime() ?? now
  const cycleElapsed = now - cycleBase
  const cycleTicks = Math.floor(cycleElapsed / ENERGY.CYCLE_INTERVAL_MS)
  let dirty = false
  let regeneratedEnergy = 0

  if (cycleTicks > 0) {
    if (player.energy < ENERGY.MAX) {
      const cardBoosts = await getRawCardBoostsById(playerId)
      const energyBoostPct = applyBoostCap(cardBoosts.energyBoost ?? 0)
      const multiplier = 1 + energyBoostPct / 100
      const regenRaw = cycleTicks * ENERGY.REGEN_RATE * multiplier
      regeneratedEnergy = Math.min(regenRaw, ENERGY.MAX - player.energy)
      player.energy = Math.min(ENERGY.MAX, player.energy + regeneratedEnergy)
    }
    player.lastCycleUpdate = new Date(cycleBase + cycleTicks * ENERGY.CYCLE_INTERVAL_MS)
    dirty = true
  }

  if (dirty) await player.save()

  return { energy: player.energy, maxEnergy: ENERGY.MAX, regeneratedEnergy, lastCycleUpdate: player.lastCycleUpdate }
}
