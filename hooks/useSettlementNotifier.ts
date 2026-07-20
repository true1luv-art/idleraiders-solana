'use client'

/**
 * hooks/useSettlementNotifier.ts
 *
 * Global poller that watches the processed-transaction ledger for newly-settled
 * deposits, withdrawals, and purchases, then patches the game store.
 *
 * Flow (matches boom-miner's useSettlementNotifier pattern):
 *   1. The browser never settles transactions — it only enqueues a pending row.
 *   2. The Solana smart-contract drain worker settles async and writes a
 *      `transactions_processed` ledger row.
 *   3. This hook polls GET /api/transactions and diffs returned txHashes against
 *      a baseline captured on the first successful fetch.
 *   4. On any NEW settled txHash it:
 *        - calls setSettlement() so modals can react to their own completion, and
 *        - calls patchPlayerState() with the returned delta (coins, etc.) so the
 *          HUD reflects the new balance without a full refetch.
 *
 * Mount once high in the game tree (inside GameProvider). No-op until the user
 * is authenticated (idlr_token exists in localStorage).
 */

import { useEffect, useRef } from 'react'
import { useGameStore } from '@/features/store/gameStore'

const POLL_INTERVAL_MS = 4_000
const PAGE_LIMIT = 25

interface ProcessedTx {
  txHash: string
  type: 'deposit' | 'withdrawal' | 'purchase'
  amount: number
  processedAt: number
}

interface TransactionsResponse {
  success: boolean
  transactions?: ProcessedTx[]
}

export function useSettlementNotifier(): void {
  const setSettlement = useGameStore((s) => s.setSettlement)
  const patchPlayerState = useGameStore((s) => s.patchPlayerState)

  // Null until the baseline lands — prevents treating history as new.
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('idlr_token')
    if (!token) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async () => {
      try {
        const res = await fetch(`/api/transactions?limit=${PAGE_LIMIT}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (cancelled || !res.ok) return

        const data = (await res.json()) as TransactionsResponse
        if (!data.success || !Array.isArray(data.transactions)) return

        const txs = data.transactions

        // First successful fetch — establish baseline, no notifications.
        if (seen.current === null) {
          seen.current = new Set(txs.map((t) => t.txHash))
          return
        }

        // Detect newly-settled rows (oldest-first).
        const fresh = txs
          .filter((t) => !seen.current!.has(t.txHash))
          .sort((a, b) => a.processedAt - b.processedAt)

        if (fresh.length === 0) return

        for (const tx of fresh) {
          seen.current!.add(tx.txHash)
          setSettlement(tx.type, tx.txHash)

          // Apply balance delta optimistically — deposit adds coins, withdrawal subtracts.
          if (tx.type === 'deposit') {
            patchPlayerState({ coins: undefined }) // will be reconciled on next fetchPlayerState
          }
        }
      } catch {
        // Transient network error — retry on the next tick.
      } finally {
        if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [setSettlement, patchPlayerState])
}
