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

    robinhood: {
      rpcUrl:       process.env.ROBINHOOD_RPC_URL ?? 'https://rpc.mainnet.chain.robinhood.com/',
      chainId:      Number(process.env.ROBINHOOD_CHAIN_ID ?? 4663),
      tokenAddress: process.env.ROBINHOOD_TOKEN_ADDRESS ?? process.env.CONTRACT_ADDRESS ?? '',
      decimals:     Number(process.env.ROBINHOOD_TOKEN_DECIMALS ?? 18),
    },

    hive: {
      rpcNodes:     (process.env.HIVE_RPC_NODES ?? 'https://api.hive.blog')
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
      engineRpcUrl: process.env.HIVE_ENGINE_RPC_URL ?? 'https://api.hive-engine.com/rpc',
      engineId:     process.env.HIVE_ENGINE_ID ?? 'ssc-mainnet-hive',
      tokenSymbol:  process.env.HIVE_TOKEN_SYMBOL ?? process.env.CONTRACT_ADDRESS ?? '',
      precision:    Number(process.env.HIVE_TOKEN_PRECISION ?? 8),
      activeKey:    process.env.HIVE_ACTIVE_KEY ?? '',
      account:      process.env.GAME_ACCOUNT_NAME ?? 'idleraiders',
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

export const GAME_ACCOUNT_NAME: string = config.blockchain.hive.account
export const HIVE_ACTIVE_KEY: string | undefined = config.blockchain.hive.activeKey || undefined

export const PORT: number = parseInt(process.env.PORT ?? '5000', 10)
export const CORS_ORIGIN: string = process.env.CORS_ORIGIN ?? 'http://localhost:3000'
