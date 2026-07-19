/**
 * server/solana-smart-contract/chain/robinhood/memo.ts
 *
 * Memo helpers for the Robinhood EVM chain.
 * Memos are carried as hex-encoded calldata on a 0-value tx.
 *
 * SERVER-ONLY.
 */

import { hexlify, toUtf8Bytes } from 'ethers'

export function buildWithdrawMemo(ref: string): string {
  return `idleraiders:withdraw:${ref}`
}

export function buildDepositMemo(ref: string): string {
  return `idleraiders:deposit:${ref}`
}

export function buildPurchaseMemo(ref: string): string {
  return `idleraiders:purchase:${ref}`
}

/** Encodes a memo string as `0x`-prefixed hex suitable for a tx `data` field. */
export function encodeMemoHex(memo: string): string {
  return hexlify(toUtf8Bytes(memo))
}
