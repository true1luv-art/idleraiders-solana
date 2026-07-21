/**
 * lib/modules/missions/repository.server.ts
 *
 * Single server-side entry point for all mission DB operations and business logic.
 * Merges former mission.repository.ts + mission.service.ts into one canonical file.
 *
 * SERVER-ONLY — never import this from client components.
 */

import Mission, { type IMission, type IMissionDocument, type MissionType, type TrainingType } from './model.server'
import type { UpdateQuery, QueryOptions, Types } from 'mongoose'
import mongoose from 'mongoose'
type FilterQuery<T> = mongoose.QueryFilter<T>

// Re-export types needed by mission.service.ts
export type { MissionType }
export type { IMission, IMissionDocument }

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateMissionData {
  owner: Types.ObjectId | string
  type: MissionType
  sourceName?: string
  startTime?: Date
  duration: number
  dungeonId?: string
  missionTypeId?: string
  territoryId?: string
  questNumber?: number
  bossId?: string
  // Generic extra
  playerId?: Types.ObjectId | string
  metadata?: Record<string, unknown>
}

export interface MissionProgress {
  missionId: string
  type: MissionType
  sourceName: string
  startTime: Date
  duration: number
  elapsedMs: number
  remainingMs: number
  completionPct: number
  isComplete: boolean
  completedAt: Date | null
}

// ═══════════════════════════════════════════════════════════════════════════════
// Repository — DB reads/writes (matching original mission.repository.ts API)
// ═══════════════════════════════════════════════════════════════════════════════

export async function create(data: CreateMissionData): Promise<IMissionDocument> {
  return Mission.create({
    ...data,
    startTime: data.startTime ?? new Date(),
    completedAt: null,
  })
}

export async function findById(id: string | Types.ObjectId): Promise<IMissionDocument | null> {
  return Mission.findById(id)
}

export async function findByIdLean(id: string | Types.ObjectId): Promise<IMission | null> {
  return Mission.findById(id).lean()
}

export async function findOne(filter: FilterQuery<IMission>): Promise<IMissionDocument | null> {
  return Mission.findOne(filter)
}

export async function findMany(
  filter: FilterQuery<IMission> = {},
  options: QueryOptions = {},
): Promise<IMissionDocument[]> {
  return Mission.find(filter, null, options)
}

export async function findByOwner(owner: Types.ObjectId | string): Promise<IMissionDocument[]> {
  return Mission.find({ owner }).sort({ createdAt: -1 })
}

/** Returns the single in-progress (not yet completed) mission for a player. */
export async function findActiveByOwner(owner: Types.ObjectId | string): Promise<IMissionDocument | null> {
  return Mission.findOne({ owner, completedAt: null })
}

export async function findCompletedByOwner(
  owner: Types.ObjectId | string,
  limit = 50,
): Promise<IMissionDocument[]> {
  return Mission.find({ owner, completedAt: { $ne: null } })
    .sort({ completedAt: -1 })
    .limit(limit)
}

export async function findByType(
  owner: Types.ObjectId | string,
  type: MissionType,
  completed?: boolean,
): Promise<IMissionDocument[]> {
  const filter: FilterQuery<IMission> = { owner, type }
  if (completed === true) filter.completedAt = { $ne: null }
  if (completed === false) filter.completedAt = null
  return Mission.find(filter).sort({ createdAt: -1 })
}

export async function findByPlayerId(playerId: string | Types.ObjectId): Promise<IMissionDocument[]> {
  return Mission.find({ owner: playerId })
}

export async function updateById(
  id: string | Types.ObjectId,
  update: UpdateQuery<IMission>,
  options: QueryOptions = { returnDocument: 'after' },
): Promise<IMissionDocument | null> {
  return Mission.findByIdAndUpdate(id, update, options)
}

export async function deleteById(id: string | Types.ObjectId): Promise<IMissionDocument | null> {
  return Mission.findByIdAndDelete(id)
}

export async function deleteByOwner(owner: Types.ObjectId | string): Promise<number> {
  const result = await Mission.deleteMany({ owner })
  return result.deletedCount ?? 0
}

/** Alias kept for backward compatibility with mission.service.ts */
export const deleteByPlayerId = deleteByOwner

// ═══════════════════════════════════════════════════════════════════════════════
// Service — lightweight helpers (complex game logic stays in mission.service.ts)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getMissionOrThrow(missionId: string | Types.ObjectId): Promise<IMissionDocument> {
  const mission = await findById(missionId)
  if (!mission) throw new Error('Mission not found')
  return mission
}

export function getMissionProgress(mission: IMission): MissionProgress {
  const now = Date.now()
  const startTime = mission.startTime instanceof Date ? mission.startTime : new Date(mission.startTime)
  const startMs = startTime.getTime()
  const durationMs = mission.duration * 1000
  const elapsedMs = Math.max(0, now - startMs)
  const remainingMs = Math.max(0, durationMs - elapsedMs)
  const completionPct = Math.min(1, elapsedMs / durationMs)
  const isComplete = elapsedMs >= durationMs
  const completedAt = isComplete ? new Date(startMs + durationMs) : null

  return {
    missionId: (mission as IMissionDocument)._id?.toString() ?? '',
    type: mission.type,
    sourceName: mission.sourceName ?? '',
    startTime,
    duration: mission.duration,
    elapsedMs,
    remainingMs,
    completionPct,
    isComplete,
    completedAt,
  }
}

export async function isPlayerOnMission(playerId: string | Types.ObjectId): Promise<boolean> {
  const mission = await Mission.findOne({ owner: playerId, completedAt: null })
  return !!mission
}

// ═══════════════════════════════════════════════════════════════════════════════
// Game Logic — migrated from mission.service.ts
// ═══════════════════════════════════════════════════════════════════════════════


import type { IPlayerDocument } from '../players/model.server'
import * as playerRepo from '../players/repository.server'
import {
  calculateDungeonReward,
  getDungeonUnlockGate,
  isMissionUnlocked,
  isMissionCompletionUnlocked,
} from './logic'
import { getRawCardBoostsById, applyBoostCap } from '../players/repository.server'
import { getManilaDateString } from '@/lib/utils/time'
import * as playerService from '../players/repository.server'
import { addCardWithDetails, CARDS_BY_ID } from '../cards/repository.server'
import Card from '../cards/model.server'
import * as historyService from '../histories/repository.server'
import GAME_DATA from '@/public/data'

// ── Types ────────────────────────────────────────────────────────────────────

interface Dungeon {
  id: string
  name: string
  requiredLevel?: number
}

interface Territory {
  id: string
  name: string
  requiredLevel: number
  dropRate: { card: number }
  quests: Quest[]
}

interface Quest {
  questNumber: number
  globalQuestNumber: number
  title: string
  requiredLevel: number
  energyCost: number
  duration: number
  rewardCard?: { cardId: string; rarity: string; type: string }
}

interface Boss {
  id: string
  name: string
  tier: number
  energyCost: number
  damageMultiplier: number
  requiredStoryProgress: number
  baseTokenReward: number
}

interface GameMissionType {
  energyCost: number
  duration: number
  baseTokenReward?: number
  fatiguePerMission?: number
}

interface StartMissionOptions { questNumber?: number }

export interface MissionResult {
  mission: IMissionDocument
  energy: number
}

export interface DungeonCompletionResult { tokens: number; xp: number }

export interface StoryCompletionResult {
  xp: number
  cardDropped: boolean
  rewardCard: { cardId: string; rarity: string; type: string } | null
  progressAdvanced: boolean
  storyProgress: number
  territoryId: string
  questNumber: number
  isFirstCompletion: boolean
}

export interface BossCompletionResult { tokens: number; xp: number }

interface HistoryPayload {
  playerId: Types.ObjectId | string
  source?: string
  eventType?: string
  eventKey?: string
  status?: string
  metadata?: Record<string, unknown>
  target?: { entityType: string; entityId: string; label: string }
  tags?: string[]
}

export interface TrainingResult {
  mission: IMissionDocument
  energy: number
  totalLuck: number
  masteryReward: number
  completesAt: Date
}

export interface TrainingCompletionResult {
  masteryGained: number
  newStoredMastery: number
  expGained: number
}

export interface TrainingLuckStats { weapons: number; mount: number; merchant: number }

export interface TrainingStatus {
  activeTraining: IMissionDocument | null
  currentLuck: TrainingLuckStats
  storedMastery: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DUNGEONS_BY_ID = Object.fromEntries(
  ((GAME_DATA as { WORLD?: { DUNGEONS?: Dungeon[] } }).WORLD?.DUNGEONS ?? []).map((d) => [d.id, d]),
) as Record<string, Dungeon>

const TERRITORIES_BY_ID = Object.fromEntries(
  ((GAME_DATA as { WORLD?: { TERRITORIES?: Territory[] } }).WORLD?.TERRITORIES ?? []).map((t) => [t.id, t]),
) as Record<string, Territory>

const BOSSES_BY_ID = Object.fromEntries(
  ((GAME_DATA as { WORLD?: { BOSSES?: Boss[] } }).WORLD?.BOSSES ?? []).map((b) => [b.id, b]),
) as Record<string, Boss>

const MISSION_TYPES =
  (GAME_DATA as { WORLD?: { MISSION_TYPES?: Record<string, GameMissionType> } }).WORLD?.MISSION_TYPES ?? {}

const TERRITORY_IDS_ORDERED = ['t1', 't2', 't3', 't4', 't5']
const BOSS_RAID_DURATION = 1800
const BOSS_RAID_ENERGY = 30
const STORY_QUEST_XP = 90
const BOSS_RAID_XP = 45

export const TRAINING_DURATION = 60 // minutes
export const TRAINING_ENERGY_COST = 40

// Training now uses hero cards — the only card type in the game.
// Previously mapped to equipment/mount/transport which no longer exist.
const TRAINING_CARD_TYPE: string = 'hero'

const TRAINING_LABELS: Record<TrainingType, string> = {
  weapons: 'Weapons Training',
  mount: 'Mount Training',
  merchant: 'Merchant Training',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTerritoryDropRate(territoryId: string): { card: number } {
  return TERRITORIES_BY_ID[territoryId]?.dropRate ?? { card: 15 }
}

async function _getPlayerOrThrow(playerId: string | Types.ObjectId): Promise<IPlayerDocument> {
  const player = await playerRepo.findById(playerId)
  if (!player) throw new Error('Player not found')
  return player
}

async function _logHistorySafe(payload: HistoryPayload): Promise<void> {
  try {
    await historyService.logEvent(payload)
  } catch (error) {
    console.warn('[MissionRepository] history log skipped:', (error as Error).message)
  }
}

function _getGlobalQuestIndex(territoryId: string, questNumber: number): number {
  const tIdx = TERRITORY_IDS_ORDERED.indexOf(territoryId)
  if (tIdx < 0) throw new Error('Unknown territory')
  return tIdx * 5 + (questNumber - 1)
}

function _clearActiveMission(player: IPlayerDocument, missionId: Types.ObjectId): void {
  if (player.activeMission && player.activeMission.toString() === missionId.toString()) {
    player.activeMission = null
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getMissionHistory(
  playerId: string | Types.ObjectId,
  limit = 50,
): Promise<IMissionDocument[]> {
  return findCompletedByOwner(playerId, limit)
}

export async function startMission(
  playerId: string | Types.ObjectId,
  sourceId: string,
  missionTypeId: string,
  { questNumber }: StartMissionOptions = {},
): Promise<MissionResult> {
  const player = await _getPlayerOrThrow(playerId)
  if (missionTypeId === 'story_quest') return _startStoryMission(player, sourceId, questNumber!)
  if (missionTypeId === 'boss_raid') return _startBossRaid(player, sourceId)
  return _startDungeonMission(player, sourceId, missionTypeId)
}

async function _startDungeonMission(
  player: IPlayerDocument,
  dungeonId: string,
  missionTypeId: string,
): Promise<MissionResult> {
  const dungeon = DUNGEONS_BY_ID[dungeonId]
  if (!dungeon) throw new Error('Dungeon not found')

  const dungeonGate = getDungeonUnlockGate(dungeon, player.level, player.milestones?.missionCompletions)
  if (!dungeonGate.unlocked) {
    if (!dungeonGate.levelMet) throw new Error('Dungeon locked - level too low')
    if (!dungeonGate.warCampaignMet) throw new Error('Dungeon locked - complete War Campaigns in previous dungeon')
  }

  if (!isMissionUnlocked(dungeon, missionTypeId, player.level)) throw new Error('Mission locked')
  if (!isMissionCompletionUnlocked(dungeonId, missionTypeId, player.milestones?.missionCompletions))
    throw new Error('Mission completion requirement not met')

  const missionType = MISSION_TYPES[missionTypeId]
  if (!missionType) throw new Error('Invalid mission type')
  if (player.energy < missionType.energyCost) throw new Error('Not enough energy')

  const active = await findActiveByOwner(player._id)
  if (active) throw new Error('Already on a mission')

  player.energy -= missionType.energyCost
  player.activeMission = null
  await player.save()

  const mission = await create({
    owner: player._id, type: 'dungeon', sourceName: dungeon.name,
    duration: missionType.duration, dungeonId, missionTypeId,
  })

  player.activeMission = mission._id as Types.ObjectId
  await player.save()

  await _logHistorySafe({
    playerId: player._id, source: 'mission', eventType: 'mission',
    eventKey: 'mission.started', status: 'started',
    metadata: {
      action: 'start', type: 'dungeon', missionId: mission._id.toString(),
      dungeonId, dungeonName: dungeon.name, missionTypeId,
      duration: missionType.duration, energyCost: missionType.energyCost, sourceName: dungeon.name,
    },
    target: { entityType: 'mission', entityId: mission._id.toString(), label: dungeon.name },
    tags: ['mission', 'dungeon'],
  })

  return { mission, energy: player.energy }
}

async function _startStoryMission(
  player: IPlayerDocument,
  territoryId: string,
  questNumber: number,
): Promise<MissionResult> {
  if (!questNumber) throw new Error('Missing questNumber for story quest')

  const territory = TERRITORIES_BY_ID[territoryId]
  if (!territory) throw new Error(`Territory not found: ${territoryId}`)
  if (player.level < territory.requiredLevel) throw new Error('Territory locked')

  const quest = territory.quests.find((q) => q.questNumber === questNumber)
  if (!quest) throw new Error(`Quest not found: territory=${territoryId}, questNumber=${questNumber}`)

  const globalQuestNumber = quest.globalQuestNumber ?? (_getGlobalQuestIndex(territoryId, questNumber) + 1)
  const storyProgress = player.milestones?.storyProgress ?? 0
  if (globalQuestNumber - 1 > storyProgress) throw new Error('Quest not yet unlocked')

  if (player.energy < quest.energyCost) throw new Error('Not enough energy')

  const active = await findActiveByOwner(player._id)
  if (active) throw new Error('Already on a mission')

  player.energy -= quest.energyCost
  await player.save()

  const mission = await create({
    owner: player._id, type: 'story', sourceName: quest.title,
    duration: quest.duration, territoryId, questNumber,
  })

  player.activeMission = mission._id as Types.ObjectId
  await player.save()

  await _logHistorySafe({
    playerId: player._id, source: 'mission', eventType: 'mission',
    eventKey: 'mission.started', status: 'started',
    metadata: {
      action: 'start', type: 'story', missionId: mission._id.toString(),
      territoryId, territoryName: territory.name, questNumber, questTitle: quest.title,
      duration: quest.duration, energyCost: quest.energyCost, sourceName: quest.title,
    },
    target: { entityType: 'mission', entityId: mission._id.toString(), label: quest.title },
    tags: ['mission', 'story'],
  })

  return { mission, energy: player.energy }
}

async function _startBossRaid(player: IPlayerDocument, bossId: string): Promise<MissionResult> {
  const boss = BOSSES_BY_ID[bossId]
  if (!boss) throw new Error('Boss not found')

  const requiredLevel = boss.tier * 15 - 14
  if (player.level < requiredLevel) throw new Error('Boss locked - level too low')

  const playerStoryProgress = player.milestones?.storyProgress ?? 0
  if (playerStoryProgress < boss.requiredStoryProgress) {
    throw new Error(`Boss locked - complete story quest ${boss.requiredStoryProgress} first`)
  }

  const bossEnergyCost = boss.energyCost ?? BOSS_RAID_ENERGY
  if (player.energy < bossEnergyCost) throw new Error('Not enough energy')

  const active = await findActiveByOwner(player._id)
  if (active) throw new Error('Already on a mission')

  player.energy -= bossEnergyCost
  await player.save()

  const mission = await create({
    owner: player._id, type: 'boss', sourceName: boss.name,
    duration: BOSS_RAID_DURATION, bossId,
  })

  player.activeMission = mission._id as Types.ObjectId
  await player.save()

  await _logHistorySafe({
    playerId: player._id, source: 'mission', eventType: 'mission',
    eventKey: 'mission.started', status: 'started',
    metadata: {
      action: 'start', type: 'boss', missionId: mission._id.toString(),
      bossId, bossName: boss.name, duration: BOSS_RAID_DURATION,
      energyCost: bossEnergyCost, sourceName: boss.name,
    },
    target: { entityType: 'mission', entityId: mission._id.toString(), label: boss.name },
    tags: ['mission', 'boss'],
  })

  return { mission, energy: player.energy }
}

export async function completeMission(
  playerId: string | Types.ObjectId,
  missionId: string | Types.ObjectId,
): Promise<DungeonCompletionResult | StoryCompletionResult | BossCompletionResult | TrainingCompletionResult | { cleared: true }> {
  const player = await _getPlayerOrThrow(playerId)
  const mission = await findById(missionId)

  if (!mission || mission.completedAt) {
    if (player.activeMission?.toString() === missionId.toString()) {
      player.activeMission = null
      await player.save()
    }
    return { cleared: true }
  }
  if (mission.owner.toString() !== player._id.toString()) throw new Error('Not your mission')

  const elapsed = Date.now() - mission.startTime.getTime()
  if (elapsed < mission.duration * 1000) throw new Error('Mission not yet complete')

  switch (mission.type) {
    case 'dungeon': return completeDungeonMission(playerId, mission)
    case 'story': return completeStoryQuest(playerId, mission)
    case 'boss': return completeBossMission(playerId, mission)
    case 'training': return completeTraining(playerId, mission._id)
    default: throw new Error(`Unknown mission type: ${mission.type}`)
  }
}

export async function completeDungeonMission(
  playerId: string | Types.ObjectId,
  mission: IMissionDocument,
): Promise<DungeonCompletionResult> {
  const player = await _getPlayerOrThrow(playerId)
  const missionType = MISSION_TYPES[mission.missionTypeId!]
  const cardBoosts = await getRawCardBoostsById(playerId)

  const now = new Date()
  const todayManila = getManilaDateString(now)
  if (!player.dailyDungeonStats) player.dailyDungeonStats = { runs: new Map(), lastReset: now }
  const lastReset = player.dailyDungeonStats.lastReset
  const lastResetManila = lastReset ? getManilaDateString(lastReset) : null
  if (lastResetManila !== todayManila) {
    player.dailyDungeonStats.lastReset = now
    player.dailyDungeonStats.runs = new Map()
  }
  const dungeonKey = `${mission.dungeonId}_${mission.missionTypeId}`
  const repeatCount = player.dailyDungeonStats.runs.get(dungeonKey) || 0

  const raidPower = cardBoosts.raidPower
  const baseReward = missionType?.baseTokenReward ?? 50
  const entryFatigue = player.missionStats?.fatigue ?? 0
  const cardMastery = cardBoosts.mastery
  const storedMastery = player.missionStats?.mastery ?? 0
  const effectiveMastery = cardMastery + storedMastery
  const energyCost = missionType?.energyCost ?? 15
  const rawTokens = calculateDungeonReward(baseReward, raidPower, repeatCount, entryFatigue, effectiveMastery, energyCost)

  if (!player.missionStats) player.missionStats = { fatigue: 0, mastery: 0, isExpBoostActive: false }
  const tokens = rawTokens

  player.missionStats.fatigue = (player.missionStats.fatigue || 0) + (missionType?.fatiguePerMission || 0)
  player.dailyDungeonStats.runs.set(dungeonKey, repeatCount + 1)

  mission.completedAt = new Date()
  await mission.save()

  _clearActiveMission(player, mission._id as Types.ObjectId)
  if (!player.milestones) player.milestones = {} as typeof player.milestones
  player.milestones!.totalMissionsCompleted = (player.milestones!.totalMissionsCompleted || 0) + 1

  if (!player.milestones!.missionCompletions) player.milestones!.missionCompletions = new Map<string, number>()
  const completionKey = `${mission.dungeonId}_${mission.missionTypeId}`
  player.milestones!.missionCompletions.set(completionKey, (player.milestones!.missionCompletions.get(completionKey) ?? 0) + 1)

  const missionMinutes = Math.floor(mission.duration / 60)
  player.milestones!.totalMinutesPlayed = (player.milestones!.totalMinutesPlayed || 0) + missionMinutes
  player.coins = (player.coins || 0) + tokens

  const baseXp = missionMinutes
  const xpBoostPct = applyBoostCap(cardBoosts.expBoost)
  const expPotionMultiplier = player.missionStats?.isExpBoostActive ? 2 : 1
  const xp = Math.round(baseXp * (1 + xpBoostPct / 100) * expPotionMultiplier)
  if (player.missionStats?.isExpBoostActive) player.missionStats.isExpBoostActive = false
  player.markModified('milestones')
  await playerService.addXp(playerId, xp, player)

  await _logHistorySafe({
    playerId: player._id, source: 'mission', eventType: 'mission', eventKey: 'mission.completed',
    metadata: {
      action: 'complete', type: 'dungeon', missionId: mission._id.toString(),
      dungeonId: mission.dungeonId, missionTypeId: mission.missionTypeId,
      tokens, xp, sourceName: mission.sourceName,
    },
    target: { entityType: 'mission', entityId: mission._id.toString(), label: mission.sourceName || mission.dungeonId || 'Unknown' },
    tags: ['mission', 'dungeon'],
  })

  return { tokens, xp }
}

export async function completeStoryQuest(
  playerId: string | Types.ObjectId,
  mission: IMissionDocument,
): Promise<StoryCompletionResult> {
  const player = await _getPlayerOrThrow(playerId)
  const cardBoosts = await getRawCardBoostsById(playerId)
  const territory = TERRITORIES_BY_ID[mission.territoryId!]
  const quest = territory?.quests.find((q) => q.questNumber === mission.questNumber)

  const globalIdx = _getGlobalQuestIndex(mission.territoryId!, mission.questNumber!)
  const storyProgress = player.milestones?.storyProgress ?? 0
  const isFirstCompletion = globalIdx === storyProgress

  let cardDropped = false
  let rewardCard: { cardId: string; rarity: string; type: string } | null = null
  let progressAdvanced = false

  if (isFirstCompletion) {
    // Story always advances on first completion — the boss gate must not be RNG-gated.
    progressAdvanced = true
    // Card drop is independent: 15% chance on first completion.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questReward = (quest as any)?.reward
    if (questReward?.id && Math.random() < 0.15) {
      const cardData = CARDS_BY_ID[questReward.id]
      const cardType = cardData?.type || 'hero'
      const cardResult = await addCardWithDetails(playerId, { id: questReward.id, rarity: questReward.rarity || 'special', type: cardType }, 'story')
      rewardCard = { cardId: questReward.id, rarity: questReward.rarity || 'special', type: cardType, ...cardResult } as typeof rewardCard
      cardDropped = true
      if (!player.milestones) player.milestones = {} as typeof player.milestones
      player.milestones!.totalCardsCollected = (player.milestones!.totalCardsCollected || 0) + 1
    }
  } else {
    const dropRate = getTerritoryDropRate(mission.territoryId!)
    if (Math.random() < dropRate.card / 100) {
      const TERRITORY_CARD_RANGES: Record<string, [number, number]> = {
        t1: [1, 5], t2: [6, 10], t3: [11, 15], t4: [16, 20], t5: [21, 25],
      }
      const [minCard, maxCard] = TERRITORY_CARD_RANGES[mission.territoryId!] || [1, 5]
      const highestCompletedStory = storyProgress
      const pool: string[] = []
      for (let i = minCard; i <= maxCard && i <= highestCompletedStory; i++) pool.push(`story_special_${i}`)

      if (pool.length > 0) {
        const randomCardId = pool[Math.floor(Math.random() * pool.length)]
        const selectedCard = CARDS_BY_ID[randomCardId]
        if (selectedCard) {
          const cardResult = await addCardWithDetails(playerId, { id: randomCardId, rarity: selectedCard.rarity, type: selectedCard.type }, 'story')
          rewardCard = { cardId: randomCardId, rarity: selectedCard.rarity, type: selectedCard.type, ...cardResult } as typeof rewardCard
          cardDropped = true
        }
      }
    }
  }

  mission.completedAt = new Date()
  await mission.save()

  _clearActiveMission(player, mission._id as Types.ObjectId)
  if (!player.milestones) player.milestones = {} as typeof player.milestones
  if (progressAdvanced) player.milestones!.storyProgress = storyProgress + 1
  player.milestones!.totalMissionsCompleted = (player.milestones!.totalMissionsCompleted || 0) + 1

  const missionMinutes = Math.floor(mission.duration / 60)
  player.milestones!.totalMinutesPlayed = (player.milestones!.totalMinutesPlayed || 0) + missionMinutes

  const xpBoostPct = applyBoostCap(cardBoosts.expBoost)
  const expPotionMultiplier = player.missionStats?.isExpBoostActive ? 2 : 1
  const xp = Math.round(STORY_QUEST_XP * (1 + xpBoostPct / 100) * expPotionMultiplier)
  if (player.missionStats?.isExpBoostActive) player.missionStats.isExpBoostActive = false
  player.markModified('milestones')
  await playerService.addXp(playerId, xp, player)

  await _logHistorySafe({
    playerId: player._id, source: 'mission', eventType: 'mission', eventKey: 'mission.completed',
    metadata: {
      action: 'complete', type: 'story', missionId: mission._id.toString(),
      territoryId: mission.territoryId, questNumber: mission.questNumber,
      isFirstCompletion, cardDropped, rewardCard, progressAdvanced,
      storyProgress: player.milestones!.storyProgress, xp, sourceName: mission.sourceName,
    },
    target: { entityType: 'mission', entityId: mission._id.toString(), label: mission.sourceName || `${mission.territoryId}#${mission.questNumber}` },
    tags: ['mission', 'story'],
  })

  return {
    xp, cardDropped, rewardCard, progressAdvanced,
    storyProgress: player.milestones!.storyProgress ?? 0,
    territoryId: mission.territoryId!, questNumber: mission.questNumber!, isFirstCompletion,
  }
}

export async function completeBossMission(
  playerId: string | Types.ObjectId,
  mission: IMissionDocument,
): Promise<BossCompletionResult> {
  const player = await _getPlayerOrThrow(playerId)
  const boss = BOSSES_BY_ID[mission.bossId!]
  if (!boss) throw new Error('Boss definition not found')

  const cardBoosts = await getRawCardBoostsById(playerId)
  const raidPower = cardBoosts.raidPower ?? 0

  // Daily repeat tracking — keyed separately from dungeon runs
  const now = new Date()
  const todayManila = getManilaDateString(now)
  if (!player.dailyDungeonStats) player.dailyDungeonStats = { runs: new Map(), lastReset: now }
  const lastReset = player.dailyDungeonStats.lastReset
  if (getManilaDateString(lastReset) !== todayManila) {
    player.dailyDungeonStats.lastReset = now
    player.dailyDungeonStats.runs = new Map()
  }
  const bossKey = `boss_${mission.bossId}`
  const repeatCount = player.dailyDungeonStats.runs.get(bossKey) ?? 0

  const entryFatigue = player.missionStats?.fatigue ?? 0
  const storedMastery = player.missionStats?.mastery ?? 0
  const cardMastery = cardBoosts.mastery
  const effectiveMastery = cardMastery + storedMastery

  // Same reward formula as dungeons — boss base reward is much higher, same decay applies
  const tokens = calculateDungeonReward(
    boss.baseTokenReward,
    raidPower,
    repeatCount,
    entryFatigue,
    effectiveMastery,
    boss.energyCost,
  )

  player.dailyDungeonStats.runs.set(bossKey, repeatCount + 1)

  mission.completedAt = new Date()
  await mission.save()

  _clearActiveMission(player, mission._id as Types.ObjectId)
  if (!player.milestones) player.milestones = {} as typeof player.milestones
  player.milestones!.totalBossesDefeated = (player.milestones!.totalBossesDefeated ?? 0) + 1
  player.milestones!.totalMissionsCompleted = (player.milestones!.totalMissionsCompleted || 0) + 1
  const missionMinutes = Math.floor(mission.duration / 60)
  player.milestones!.totalMinutesPlayed = (player.milestones!.totalMinutesPlayed || 0) + missionMinutes
  player.coins = (player.coins || 0) + tokens

  const xpBoostPct = applyBoostCap(cardBoosts.expBoost)
  const expPotionMultiplier = player.missionStats?.isExpBoostActive ? 2 : 1
  const xp = Math.round(BOSS_RAID_XP * (1 + xpBoostPct / 100) * expPotionMultiplier)
  if (player.missionStats?.isExpBoostActive) player.missionStats.isExpBoostActive = false
  player.markModified('milestones')
  await playerService.addXp(playerId, xp, player)

  await _logHistorySafe({
    playerId: player._id, source: 'mission', eventType: 'mission', eventKey: 'mission.completed',
    metadata: {
      action: 'complete', type: 'boss', missionId: mission._id.toString(),
      bossId: mission.bossId, bossName: boss.name,
      tokens, xp, repeatCount, sourceName: mission.sourceName,
    },
    target: { entityType: 'mission', entityId: mission._id.toString(), label: mission.sourceName || mission.bossId || 'Unknown' },
    tags: ['mission', 'boss'],
  })

  return { tokens, xp }
}

export async function attackBoss(
  playerId: string | Types.ObjectId,
  bossId: string,
  raidPower: number,
): Promise<BossCompletionResult> {
  const player = await _getPlayerOrThrow(playerId)
  const boss = BOSSES_BY_ID[bossId]
  if (!boss) throw new Error('Boss not found')

  const cardBoosts = await getRawCardBoostsById(playerId)
  const tierMultiplier = boss.damageMultiplier ?? 1.0
  const baseDamage = Math.floor(raidPower * (0.8 + Math.random() * 0.4) * tierMultiplier)
  const damage = Math.max(1, baseDamage)

  if (!player.milestones) player.milestones = {} as typeof player.milestones
  player.milestones!.totalBossDamage = (player.milestones!.totalBossDamage || 0) + damage

  const xpBoostPct = applyBoostCap(cardBoosts.expBoost)
  const expPotionMultiplier = player.missionStats?.isExpBoostActive ? 2 : 1
  const bossXp = Math.round(BOSS_RAID_XP * (1 + xpBoostPct / 100) * expPotionMultiplier)
  if (player.missionStats?.isExpBoostActive) player.missionStats.isExpBoostActive = false
  await playerService.addXp(playerId, bossXp, player)

  await _logHistorySafe({
    playerId: player._id, source: 'mission', eventType: 'mission', eventKey: 'mission.boss_attack',
    metadata: {
      action: 'attack', type: 'boss', bossId, bossName: boss.name,
      damage, xp: bossXp, sourceName: boss.name,
    },
    target: { entityType: 'boss', entityId: bossId, label: boss.name },
    tags: ['mission', 'boss'],
  })

  return { damage, bossDefeated: false, xp: bossXp }
}

export function calculateMasteryReward(totalLuck: number): number {
  return Math.floor(50 + totalLuck / 100)
}

export async function startTraining(
  playerId: string | Types.ObjectId,
  trainingType: TrainingType,
): Promise<TrainingResult> {
  const player = await _getPlayerOrThrow(playerId)

  if (!['weapons', 'mount', 'merchant'].includes(trainingType)) {
    throw new Error('Invalid training type')
  }

  const active = await findActiveByOwner(player._id)
  if (active) throw new Error('Already on a mission or training')

  if (player.energy < TRAINING_ENERGY_COST) throw new Error('Not enough energy')

  const dbCards = await Card.find({ owner: player._id, type: TRAINING_CARD_TYPE }).lean()
  let totalLuck = 0
  for (const card of dbCards) {
    const cardDef = CARDS_BY_ID[card.cardId] ?? {}
    const qty = card.quantity ?? 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const luck = (cardDef as any).stats?.luck ?? 0
    totalLuck += luck * qty
  }
  const masteryReward = calculateMasteryReward(totalLuck)

  player.energy -= TRAINING_ENERGY_COST
  await player.save()

  const mission = await create({
    owner: player._id, type: 'training',
    sourceName: TRAINING_LABELS[trainingType],
    duration: TRAINING_DURATION * 60,
  })

  player.activeMission = mission._id as Types.ObjectId
  await player.save()

  const completesAt = new Date(mission.startTime.getTime() + TRAINING_DURATION * 60 * 1000)

  await _logHistorySafe({
    playerId: player._id, source: 'training', eventType: 'training',
    eventKey: 'training.started', status: 'started',
    metadata: {
      action: 'start', type: 'training', trainingType, missionId: mission._id.toString(),
      totalLuck, masteryReward, duration: TRAINING_DURATION,
      energyCost: TRAINING_ENERGY_COST, sourceName: TRAINING_LABELS[trainingType],
    },
    target: { entityType: 'training', entityId: mission._id.toString(), label: TRAINING_LABELS[trainingType] },
    tags: ['training', trainingType],
  })

  return { mission, energy: player.energy, totalLuck, masteryReward, completesAt }
}

export async function completeTraining(
  playerId: string | Types.ObjectId,
  missionId: string | Types.ObjectId,
): Promise<TrainingCompletionResult> {
  const player = await _getPlayerOrThrow(playerId)
  const mission = await findById(missionId)

  if (!mission || mission.completedAt) throw new Error('Training not found or already completed')
  if (mission.owner.toString() !== player._id.toString()) throw new Error('Not your training session')
  if (mission.type !== 'training') throw new Error('This is not a training session')

  const elapsed = Date.now() - mission.startTime.getTime()
  if (elapsed < mission.duration * 1000) throw new Error('Training not yet complete')

  const dbCards = await Card.find({ owner: player._id, type: TRAINING_CARD_TYPE }).lean()
  let totalLuck = 0
  for (const card of dbCards) {
    const cardDef = CARDS_BY_ID[card.cardId] ?? {}
    const qty = card.quantity ?? 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const luck = (cardDef as any).stats?.luck ?? 0
    totalLuck += luck * qty
  }
  const masteryGained = calculateMasteryReward(totalLuck)

  mission.completedAt = new Date()
  await mission.save()

  if (!player.missionStats) player.missionStats = { fatigue: 0, mastery: 0, isExpBoostActive: false }
  player.missionStats.mastery = (player.missionStats.mastery ?? 0) + masteryGained
  const newStoredMastery = player.missionStats.mastery

  const expGained = Math.floor(mission.duration / 60) * 2
  player.exp = (player.exp ?? 0) + expGained

  if (!player.milestones) player.milestones = {} as typeof player.milestones
  player.milestones!.totalTrainingSessions = (player.milestones!.totalTrainingSessions ?? 0) + 1
  const trainingMinutes = Math.floor(mission.duration / 60)
  player.milestones!.totalMinutesPlayed = (player.milestones!.totalMinutesPlayed ?? 0) + trainingMinutes

  if (player.activeMission && player.activeMission.toString() === mission._id.toString()) {
    player.activeMission = null
  }
  player.markModified('milestones')
  await player.save()

  await _logHistorySafe({
    playerId: player._id, source: 'training', eventType: 'training',
    eventKey: 'training.completed', status: 'completed',
    metadata: {
      action: 'complete', type: 'training', trainingType, missionId: mission._id.toString(),
      totalLuck, masteryGained, newStoredMastery, expGained, sourceName: mission.sourceName,
    },
    target: { entityType: 'training', entityId: mission._id.toString(), label: mission.sourceName || 'Training' },
    tags: ['training', trainingType],
  })

  return { masteryGained, newStoredMastery, expGained }
}
