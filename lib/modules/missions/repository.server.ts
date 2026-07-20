/**
 * lib/modules/missions/repository.server.ts
 *
 * Single server-side entry point for all mission DB operations and business logic.
 * Merges: mission.repository.ts + mission.service.ts (base layer — game-heavy
 * logic remains in mission.service.ts which imports from here).
 *
 * SERVER-ONLY — never import this from client components.
 */

import Mission, { type IMission, type IMissionDocument, type MissionType } from './model.server'
import type { FilterQuery, UpdateQuery, QueryOptions, Types } from 'mongoose'

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
  // War mission fields
  guildWarId?: Types.ObjectId
  targetOutpostId?: string
  targetGuildId?: Types.ObjectId
  trainingType?: string
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
