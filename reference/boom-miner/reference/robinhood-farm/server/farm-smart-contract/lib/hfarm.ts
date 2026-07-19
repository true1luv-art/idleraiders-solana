/**
 * lib/chain/hfarm.ts
 *
 * Minimal ERC-20 ABI for the $HFARM token and contract accessors.
 * Only the functions and events used by the bridge are included.
 *
 * SERVER-ONLY — imports from lib/chain/client.ts which holds the treasury key.
 */

import { getContract } from "viem";
import { config }      from "@/lib/config/config";
import { publicClient, getWalletClient } from "./client";

// ---------------------------------------------------------------------------
// Minimal ERC-20 ABI — transfer, balanceOf, decimals, Transfer event
// ---------------------------------------------------------------------------

export const HFARM_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs:  [
      { name: "to",    type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs:  [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from",  type: "address", indexed: true  },
      { name: "to",    type: "address", indexed: true  },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

/** $HFARM uses 18 decimals (standard ERC-20). */
export const HFARM_DECIMALS = 18n;

/** Returns a read-only contract instance bound to the public client. */
export function hfarmReadContract() {
  return getContract({
    address: config.hfarmTokenAddress as `0x${string}`,
    abi:     HFARM_ABI,
    client:  publicClient,
  });
}

/** Returns a write-capable contract instance bound to the treasury wallet client. */
export function hfarmWriteContract() {
  return getContract({
    address: config.hfarmTokenAddress as `0x${string}`,
    abi:     HFARM_ABI,
    client:  getWalletClient(),
  });
}
