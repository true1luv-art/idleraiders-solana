/**
 * lib/chain/client.ts
 *
 * Viem public + wallet clients for Robinhood Chain (EVM L2, chain ID 4663).
 *
 * SERVER-ONLY — this file reads TREASURY_PRIVATE_KEY from config.
 * Never import it from a 'use client' file.
 */

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "@/lib/config/config";

// ---------------------------------------------------------------------------
// Chain definition
// ---------------------------------------------------------------------------

export const robinhoodChain = {
  id:   4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [config.hfarmRpcUrl || ""] },
  },
} as const;

// ---------------------------------------------------------------------------
// Public client — read-only (receipt lookup, balance checks).
// Safe to initialise eagerly; no private key needed.
// Falls back to a no-op transport when RPC URL is absent (build time).
// ---------------------------------------------------------------------------

export const publicClient = createPublicClient({
  chain:     robinhoodChain,
  transport: http(config.hfarmRpcUrl || ""),
});

// ---------------------------------------------------------------------------
// Treasury signing client — lazy getters so the private-key check only fires
// at call time (not at module evaluation / build time).
// ---------------------------------------------------------------------------

function normalisePk(raw: string): `0x${string}` {
  if (!raw) throw new Error("TREASURY_PRIVATE_KEY env var is not set");
  return raw.startsWith("0x") ? (raw as `0x${string}`) : `0x${raw}`;
}

let _walletClient: ReturnType<typeof createWalletClient> | null = null;

export function getWalletClient() {
  if (!_walletClient) {
    const account = privateKeyToAccount(normalisePk(config.treasuryPrivateKey));
    _walletClient = createWalletClient({
      account,
      chain:     robinhoodChain,
      transport: http(config.hfarmRpcUrl),
    });
  }
  return _walletClient;
}
