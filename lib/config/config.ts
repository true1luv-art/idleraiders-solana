/**
 * lib/config/config.ts
 *
 * Central configuration — the ONLY place that reads process.env.
 * All other modules must import from here.
 *
 * SERVER-ONLY: never import this from a 'use client' file.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Environment
// ─────────────────────────────────────────────────────────────────────────────

export const NODE_ENV: string = process.env.NODE_ENV || 'development'
export const IS_PRODUCTION: boolean = NODE_ENV === 'production'

// ─────────────────────────────────────────────────────────────────────────────
// Chain
// ─────────────────────────────────────────────────────────────────────────────

export type SupportedChain = 'solana' | 'hive' | 'robinhood'

function resolveChain(): SupportedChain {
  const raw = (
    process.env.NEXT_PUBLIC_CHAIN ??
    process.env.CHAIN ??
    'solana'
  ).toLowerCase()

  if (raw === 'hive') return 'hive'
  if (raw === 'robinhood') return 'robinhood'
  return 'solana'
}

// ─────────────────────────────────────────────────────────────────────────────
// Structured config (boom-miner pattern)
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  mongoUri: IS_PRODUCTION
    ? process.env.MONGO_URI!
    : (process.env.MONGO_URI_LOCAL ?? process.env.MONGO_URI!),

  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',

  // Pack / mint pricing (whole-token amounts; multiply by decimals before sending)
  // Env vars override; constants/game.ts MINT_COST is the canonical fallback for heroes.
  // Single heroes pack price — the only pack in the game.
  // All other card types (equipment, mounts, etc.) drop from this same pack.
  pack: {
    heroes:       Number(process.env.PACK_PRICE_HEROES    ?? 500_000),
    registration: Number(process.env.REGISTRATION_FEE    ?? 1_000),
  },

  // Worker tuning
  withdrawal: {
    workerPollMs: 5000,
    maxRetries: 8,
  },

  mint: {
    workerMaxRetries: 30,
    verifyMaxTries: 2,
  },

  blockchain: {
    chain:           resolveChain(),
    contractAddress: process.env.CONTRACT_ADDRESS ?? '',
    treasuryAddress: process.env.TREASURY_ADDRESS ?? '',
    treasuryKey:     process.env.TREASURY_KEY ?? '',

    solana: {
      rpcUrl:      process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com',
      heliusApiKey: process.env.HELIUS_API_KEY ?? '',
      mint:        process.env.CONTRACT_ADDRESS ?? '',
    },

    // Robinhood Chain constants — hardcoded (no env vars needed)
    robinhood: {
      rpcUrl:       'https://rpc.mainnet.chain.robinhood.com/',
      chainId:      4663,
      // Same token contract as the game's primary CONTRACT_ADDRESS
      tokenAddress: process.env.CONTRACT_ADDRESS ?? '',
      decimals:     18,
    },

    // Hive / Hive-Engine constants — hardcoded (no env vars needed)
    hive: {
      rpcNodes:     [
        'https://api.hive.blog',
        'https://api.hivekings.com',
        'https://anyx.io',
        'https://hived.privex.io',
      ],
      engineRpcUrl: 'https://api.hive-engine.com/rpc',
      engineId:     'ssc-mainnet-hive',
      // Same symbol / address as CONTRACT_ADDRESS on Hive-Engine
      tokenSymbol:  process.env.CONTRACT_ADDRESS ?? '',
      precision:    8,
      // Hive treasury re-uses the shared TREASURY_KEY and TREASURY_ADDRESS
      activeKey:    process.env.TREASURY_KEY ?? '',
      account:      process.env.TREASURY_ADDRESS ?? '',
    },
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Legacy named exports — preserved for backward compatibility.
// All callers can continue to import these without any changes.
// ─────────────────────────────────────────────────────────────────────────────

export const MONGO_URI: string | undefined = config.mongoUri

export const JWT_SECRET_ENCODED: Uint8Array = new TextEncoder().encode(config.jwtSecret)
export const JWT_EXPIRY_SECONDS: number = 7 * 24 * 60 * 60 // 7 days

export const PORT: number = parseInt(process.env.PORT ?? '5000', 10)
export const CORS_ORIGIN: string = process.env.CORS_ORIGIN ?? 'http://localhost:3000'
