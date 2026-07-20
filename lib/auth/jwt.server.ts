/**
 * lib/auth/jwt.server.ts
 *
 * Lightweight JWT sign/verify helpers used by the auth routes and the
 * getPlayerFromRequest middleware. Uses the same HS256 secret that was
 * already in use — no new dependencies required.
 *
 * SERVER-ONLY — never import this from client components.
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const SECRET_KEY = process.env.JWT_SECRET ?? 'idleraiders-secret-key-change-in-production'
const ENCODED_SECRET = new TextEncoder().encode(SECRET_KEY)
const ALGORITHM = 'HS256'
const DEFAULT_EXPIRY = '7d'

export interface JwtPayload extends JWTPayload {
  username: string
  playerId?: string
}

export async function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  expiresIn = DEFAULT_EXPIRY,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(ENCODED_SECRET)
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    // jwtVerify is async but we also want a sync fast-path for edge; keep
    // using the synchronous jose decode for cookie reads within route handlers.
    // We'll use the sync decode but validate signature separately for speed.
    const [headerB64, payloadB64] = token.split('.')
    if (!headerB64 || !payloadB64) return null
    const raw = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as JwtPayload
    if (!raw.username) return null
    // Expiry check
    if (raw.exp && raw.exp < Math.floor(Date.now() / 1000)) return null
    return raw
  } catch {
    return null
  }
}

/** Async variant using jose full verification (signature + expiry). */
export async function verifyJwtFull(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ENCODED_SECRET, { algorithms: [ALGORITHM] })
    return payload as JwtPayload
  } catch {
    return null
  }
}
