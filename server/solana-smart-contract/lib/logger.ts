/**
 * server/solana-smart-contract/lib/logger.ts
 *
 * Simple structured logger for the drain worker. Outputs JSON lines so output
 * can be piped to any log aggregator.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const entry = {
    ts:      new Date().toISOString(),
    level,
    service: 'idleraiders:drain-worker',
    message,
    ...meta,
  }
  const line = JSON.stringify(entry)
  if (level === 'error' || level === 'warn') {
    console.error(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  info:  (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn:  (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
}
