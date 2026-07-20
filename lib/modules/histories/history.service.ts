/**
 * @deprecated Use `lib/modules/histories/repository.server.ts` directly.
 * This shim re-exports all functions for backward compatibility and adds the
 * legacy overloaded `logEvent` signature that mission.service.ts uses.
 */
export * from './repository.server'

import type { IHistoryDocument } from './model.server'
import { logEvent as _logEvent } from './repository.server'

// Preserve the old positional overload: logEvent(username, source, eventType, data)
export async function logEvent(payload: Parameters<typeof _logEvent>[0]): Promise<IHistoryDocument>
export async function logEvent(
  username: string,
  source: string,
  eventType: string,
  data: Record<string, unknown>,
): Promise<IHistoryDocument>
export async function logEvent(
  usernameOrPayload: string | Parameters<typeof _logEvent>[0],
  sourceArg?: string,
  eventTypeArg?: string,
  dataArg?: Record<string, unknown>,
): Promise<IHistoryDocument> {
  if (typeof usernameOrPayload === 'object' && usernameOrPayload !== null && sourceArg === undefined) {
    return _logEvent(usernameOrPayload)
  }
  return _logEvent({
    username: usernameOrPayload as string,
    source: sourceArg,
    eventType: eventTypeArg,
    data: dataArg,
  })
}

export async function getHistory(
  playerOrUsername: string | { username?: string },
  options: { eventType?: string; source?: string; limit?: number } = {},
): Promise<{ entries: IHistoryDocument[]; total: number }> {
  const { queryHistory } = await import('./repository.server')
  const username =
    typeof playerOrUsername === 'string' ? playerOrUsername : (playerOrUsername.username ?? '')
  const entries = await queryHistory({
    username,
    eventType: options.eventType,
    source: options.source,
    limit: options.limit ?? 50,
  })
  return { entries, total: entries.length }
}

export async function clearHistory(username: string): Promise<{ deleted: number }> {
  const { findMany, deleteById } = await import('./repository.server')
  const entries = await findMany({ username })
  await Promise.all(entries.map((e) => deleteById(e._id)))
  return { deleted: entries.length }
}
