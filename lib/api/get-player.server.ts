/**
 * lib/api/get-player.server.ts
 *
 * Shared helper used by every App Router route handler that needs an
 * authenticated player document. Reads the JWT from cookies, verifies it,
 * and returns the live Mongoose document.
 *
 * Usage:
 *   const { player, errorResponse } = await getPlayerFromRequest(request)
 *   if (errorResponse) return errorResponse
 */
import { type NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt.server'
import { findByUsername } from '@/lib/modules/players/repository.server'
import { errorResponse } from './error-response.server'
import type { IPlayerDocument } from '@/lib/modules/players/model.server'

export interface GetPlayerResult {
  player: IPlayerDocument
  username: string
  errorResponse?: never
}

export interface GetPlayerError {
  player?: never
  username?: never
  errorResponse: NextResponse
}

export type GetPlayerOutcome = GetPlayerResult | GetPlayerError

/** Resolve the player from the `auth_token` cookie. */
export async function getPlayerFromRequest(
  req: NextRequest,
): Promise<GetPlayerOutcome> {
  const token = req.cookies.get('auth_token')?.value ?? null

  if (!token) {
    return { errorResponse: errorResponse('Not authenticated', 401) }
  }

  const payload = verifyJwt(token)
  if (!payload?.username) {
    return { errorResponse: errorResponse('Invalid or expired token', 401) }
  }

  const player = await findByUsername(payload.username)
  if (!player) {
    return { errorResponse: errorResponse('Player not found', 404) }
  }

  return { player, username: player.username }
}

/** Same, but the username is already known (e.g. from a validated param). */
export async function getPlayerByUsername(
  username: string,
): Promise<GetPlayerOutcome> {
  if (!username?.trim()) {
    return { errorResponse: errorResponse('Username required', 400) }
  }

  const player = await findByUsername(username)
  if (!player) {
    return { errorResponse: errorResponse('Player not found', 404) }
  }

  return { player, username: player.username }
}
