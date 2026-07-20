/**
 * lib/api/error-response.server.ts
 *
 * Tiny helpers for creating consistent JSON error and success responses.
 */
import { NextResponse } from 'next/server'

export function errorResponse(
  message: string,
  status = 500,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ success: false, error: message, ...extra }, { status })
}

export function successResponse<T>(
  data: T,
  status = 200,
): NextResponse<{ success: true } & T extends Record<string, unknown> ? T : { data: T }> {
  const body =
    data !== null && typeof data === 'object' && !Array.isArray(data)
      ? { success: true, ...(data as Record<string, unknown>) }
      : { success: true, data }
  return NextResponse.json(body, { status }) as ReturnType<typeof successResponse<T>>
}
