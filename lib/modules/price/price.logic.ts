/**
 * Price Logic
 * In-process HIVE/USD price cache. Updated by the price worker every 5 minutes.
 * Moved out of the legacy transactions module so it has no dependency on the
 * old Transaction collection.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Errors
// ═══════════════════════════════════════════════════════════════════════════════

export class HivePriceNotInitializedError extends Error {
  constructor() {
    super('HIVE/USD price is not initialized yet. Please try again shortly.')
    this.name = 'HivePriceNotInitializedError'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cache
// ═══════════════════════════════════════════════════════════════════════════════

let cachedHiveUsdPrice: number | null = null

export function setHiveUsdPrice(price: number): void {
  if (!Number.isFinite(price) || price <= 0) {
    console.warn('[idleraiders-logs] Ignoring invalid HIVE/USD price:', price)
    return
  }
  cachedHiveUsdPrice = price
}

export async function isHiveUsdPriceInitialized(): Promise<boolean> {
  return cachedHiveUsdPrice !== null && cachedHiveUsdPrice > 0
}

export async function getHiveUsdPrice(): Promise<number> {
  if (cachedHiveUsdPrice !== null && cachedHiveUsdPrice > 0) {
    return cachedHiveUsdPrice
  }
  throw new HivePriceNotInitializedError()
}

export async function getCurrentHivePrice(): Promise<number> {
  return getHiveUsdPrice()
}
