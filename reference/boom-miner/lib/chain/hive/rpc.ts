/**
 * lib/chain/hive/rpc.ts
 *
 * Hive consensus-layer client (dhive) + Hive-Engine layer-2 accessors +
 * treasury account/key accessors.
 *
 * Token transfers happen on Hive-Engine (an L2 sidechain) via a `custom_json`
 * operation broadcast on the Hive consensus layer with the treasury's ACTIVE
 * key. Balance reads hit the Hive-Engine JSON-RPC contracts API.
 *
 * SERVER-ONLY — reads the treasury active key from config. Never import this
 * from a 'use client' file.
 */

import { Client, PrivateKey } from "@hiveio/dhive";
import { config } from "@/lib/config/config";

const hive = config.blockchain.hive;

// ---------------------------------------------------------------------------
// Consensus-layer client — lazy, reused. Accepts multiple failover nodes.
// ---------------------------------------------------------------------------

let _client: Client | null = null;

export function getHiveClient(): Client {
  if (!_client) {
    _client = new Client(hive.rpcNodes);
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Treasury account + signing key.
//   treasuryAddress → Hive account username (payer/sender)
//   treasuryKey     → Hive ACTIVE private key (WIF string)
// Lazy so the key is only parsed at call time, not at build/import time.
// ---------------------------------------------------------------------------

export function getTreasuryAccount(): string {
  const account = config.blockchain.treasuryAddress?.trim();
  if (!account) throw new Error("TREASURY_ADDRESS (Hive account) is not set");
  return account.toLowerCase();
}

let _activeKey: PrivateKey | null = null;

export function getTreasuryActiveKey(): PrivateKey {
  if (!_activeKey) {
    const raw = config.blockchain.treasuryKey?.trim();
    if (!raw) throw new Error("TREASURY_KEY (Hive active key) is not set");
    _activeKey = PrivateKey.fromString(raw);
  }
  return _activeKey;
}

// ---------------------------------------------------------------------------
// Hive-Engine (layer-2) settings.
// ---------------------------------------------------------------------------

/** Hive-Engine JSON-RPC contracts endpoint (used for balance reads). */
export const ENGINE_RPC_URL = hive.engineRpcUrl;

/** custom_json id that routes an op to the Hive-Engine sidechain. */
export const ENGINE_ID = hive.engineId;

/** Hive-Engine token symbol the treasury pays out. */
export function getTokenSymbol(): string {
  if (!hive.tokenSymbol) throw new Error("HIVE_TOKEN_SYMBOL (or CONTRACT_ADDRESS) is not set");
  return hive.tokenSymbol.toUpperCase();
}

/** Token precision (decimal places) as configured on Hive-Engine. */
export const TOKEN_PRECISION = hive.precision;

/**
 * Reads a Hive-Engine token balance for `account` via the contracts API.
 * Returns the balance as a number (whole tokens), or 0 if none.
 */
export async function getEngineBalance(account: string, symbol: string): Promise<number> {
  const res = await fetch(ENGINE_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "findOne",
      params: {
        contract: "tokens",
        table: "balances",
        query: { account: account.toLowerCase(), symbol: symbol.toUpperCase() },
      },
    }),
  });

  if (!res.ok) throw new Error(`Hive-Engine RPC error: ${res.status}`);
  const json = (await res.json()) as { result?: { balance?: string } | null };
  return json.result?.balance ? Number(json.result.balance) : 0;
}
