import Transaction from './transaction.model'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface PurchaseQuote {
  expectedHiveMilli: number
  expectedHive: number
  hiveUsdAtQuote: number
  quantity: number
  dollarsToReceive: number
  usdEquivalent: number
}

interface ExpectedHiveResult {
  expectedHive: number
  hiveUsdAtQuote: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// Errors
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Thrown when a price-dependent operation is requested before the price worker
 * has reported a HIVE/USD rate at least once. Callers should treat this as
 * "service temporarily unavailable" (retry) rather than a permanent failure.
 */
export class HivePriceNotInitializedError extends Error {
  constructor() {
    super('HIVE/USD price is not initialized yet. Please try again shortly.')
    this.name = 'HivePriceNotInitializedError'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const USD_PER_UNIT = 1.0

// In-process price cache — the price worker updates this via setHiveUsdPrice()
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

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════

export async function getReservedWithdrawalTotal(symbol: string): Promise<number> {
  const reserved = await Transaction.aggregate([
    {
      $match: {
        type: 'withdraw',
        status: { $in: ['pending', 'processing'] },
        'metadata.symbol': symbol,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$metadata.quantity' },
      },
    },
  ])

  return reserved[0]?.total || 0
}

export async function getEffectiveBalance(onChainBalance: number, symbol: string): Promise<number> {
  const reserved = await getReservedWithdrawalTotal(symbol)
  return onChainBalance - reserved
}

export async function createPurchaseQuote(quantity: number): Promise<PurchaseQuote> {
  const hiveUsd = await getHiveUsdPrice()
  const totalUsd = quantity * USD_PER_UNIT
  const hiveMilli = Math.round((totalUsd / hiveUsd) * 1000)

  return {
    expectedHiveMilli: hiveMilli,
    expectedHive: hiveMilli / 1000,
    hiveUsdAtQuote: hiveUsd,
    quantity,
    dollarsToReceive: quantity,
    usdEquivalent: totalUsd,
  }
}

export async function calculateExpectedHive(quantity: number): Promise<ExpectedHiveResult> {
  const hiveUsd = await getHiveUsdPrice()
  const totalUsd = quantity * USD_PER_UNIT
  const expectedHive = totalUsd / hiveUsd
  return { expectedHive, hiveUsdAtQuote: hiveUsd }
}
