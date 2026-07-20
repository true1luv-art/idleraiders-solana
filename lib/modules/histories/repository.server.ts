/**
 * lib/modules/histories/repository.server.ts
 *
 * Single server-side entry point for all history DB operations and business logic.
 * Merges: history.repository.ts + history.service.ts
 *
 * SERVER-ONLY — never import this from client components.
 */

import History, { type IHistory, type IHistoryDocument } from './model.server'
import type { QueryOptions, Types } from 'mongoose'
import mongoose from 'mongoose'
type FilterQuery<T> = mongoose.QueryFilter<T>

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface LogEventPayload {
  username?: string
  playerId?: Types.ObjectId | string | null
  source?: string
  eventType?: string
  eventKey?: string
  data?: Record<string, unknown>
  metadata?: Record<string, unknown>
  tags?: string[]
  status?: 'started' | 'completed' | 'failed' | 'cancelled'
}

export interface HistoryQuery {
  username?: string
  playerId?: Types.ObjectId | string
  eventType?: string
  eventKey?: string
  source?: string
  from?: Date
  to?: Date
  limit?: number
  skip?: number
  sort?: 'asc' | 'desc'
}

// ═══════════════════════════════════════════════════════════════════════════════
// Repository — DB reads/writes
// ═══════════════════════════════════════════════════════════════════════════════

export async function create(payload: LogEventPayload): Promise<IHistoryDocument> {
  return History.create(payload)
}

export async function findById(id: string | Types.ObjectId): Promise<IHistoryDocument | null> {
  return History.findById(id)
}

export async function findMany(
  filter: FilterQuery<IHistory> = {},
  options: QueryOptions = {},
): Promise<IHistoryDocument[]> {
  return History.find(filter, null, options)
}

export async function findByUsername(
  username: string,
  limit = 50,
): Promise<IHistoryDocument[]> {
  return History.find({ username }).sort({ createdAt: -1 }).limit(limit)
}

export async function findByEventKey(
  eventKey: string,
  limit = 50,
): Promise<IHistoryDocument[]> {
  return History.find({ eventKey }).sort({ createdAt: -1 }).limit(limit)
}

export async function count(filter: FilterQuery<IHistory> = {}): Promise<number> {
  return History.countDocuments(filter)
}

export async function deleteById(id: string | Types.ObjectId): Promise<IHistoryDocument | null> {
  return History.findByIdAndDelete(id)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Service — event logging (replaces history.service.ts)
// ═══════════════════════════════════════════════════════════════════════════════

export async function logEvent(payload: LogEventPayload): Promise<IHistoryDocument> {
  try {
    const source = payload.source ?? 'system'
    const eventType = payload.eventType ?? 'event'
    const eventKey = payload.eventKey ?? `${source}.${eventType}`
    const username = payload.username ?? ''
    const actor = {
      playerId: payload.playerId ?? null,
      username,
    }
    const context = {
      service: source,
      action: eventType,
      correlationId: null,
    }
    const data = payload.data ?? payload.metadata ?? {}

    return await History.create({
      username,
      source,
      eventType,
      data,
      eventKey,
      status: payload.status ?? 'completed',
      actor,
      context,
      metadata: data,
      tags: payload.tags ?? [],
    })
  } catch (err) {
    console.warn('[idleraiders-logs] logEvent failed:', (err as Error).message)
    throw err
  }
}

export async function queryHistory(params: HistoryQuery): Promise<IHistoryDocument[]> {
  const filter: FilterQuery<IHistory> = {}

  if (params.username) filter.username = params.username
  if (params.eventType) filter.eventType = params.eventType
  if (params.eventKey) filter.eventKey = params.eventKey
  if (params.source) filter.source = params.source
  if (params.playerId) filter['actor.playerId'] = params.playerId

  if (params.from || params.to) {
    filter.createdAt = {}
    if (params.from) filter.createdAt.$gte = params.from
    if (params.to) filter.createdAt.$lte = params.to
  }

  const sort = params.sort === 'asc' ? 1 : -1
  const limit = params.limit ?? 50
  const skip = params.skip ?? 0

  return History.find(filter).sort({ createdAt: sort }).skip(skip).limit(limit)
}
