/**
 * Central configuration — the ONLY place that reads process.env.
 * All other modules must import from here.
 */
export const config = {
  mongoUri:  process.env.MONGODB_URI!,
  jwtSecret: process.env.JWT_SECRET ?? "changeme-dev-secret",

  // ---------------------------------------------------------------------------
  // HFARM on-chain bridge — Robinhood Chain (EVM L2, chain ID 4663)
  // These are server-only vars. Never import config from a 'use client' file.
  // ---------------------------------------------------------------------------

  /** Robinhood Chain JSON-RPC endpoint. */
  hfarmRpcUrl: process.env.HFARM_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com/",

  /** ERC-20 contract address of the $HFARM token on Robinhood Chain. */
  hfarmTokenAddress: process.env.HFARM_TOKEN_ADDRESS ?? "",

  /** Public address of the treasury EOA wallet. */
  hfarmTreasuryAddress: process.env.HFARM_TREASURY_ADDRESS ?? "",

  /**
   * Private key of the treasury EOA wallet (hex, with or without 0x prefix).
   * Used ONLY in lib/chain/client.ts to construct the viem walletClient.
   * Must never reach the browser.
   */
  treasuryPrivateKey: process.env.TREASURY_PRIVATE_KEY ?? "",
} as const;
