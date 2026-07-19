# Solana Transaction & Smart Contract Implementation Plan

## Overview

This plan migrates the existing Hive-only transaction system to a **Solana-primary** architecture
while preserving the three-chain switch (`solana | hive | robinhood`). It replaces the current
monolithic `Transaction` collection + polling worker with the two-collection durable-queue pattern
from boom-miner: `transactions_pending` (work queue) and `transactions_processed` (immutable ledger).

The scope is:
1. New `transactions_pending` collection — durable work queue for deposit, withdrawal, and purchase.
2. New `transactions_processed` collection — immutable settlement ledger.
3. New `server/solana-smart-contract/` worker directory — Solana chain adapters and drain workers.
4. New `/server/chain/` adapters for all three chains (Solana, Hive, Robinhood).
5. Config expansion — add Solana, Robinhood, and multi-chain env vars alongside existing Hive vars.
6. Player model addition — add `walletAddress` (Solana public key) alongside existing `username`.

The existing `Transaction` collection and its worker are **retired** but not deleted immediately —
they run in parallel until the new system is proven, then removed in a follow-up cleanup.

---

## 1. Architecture Overview

```
Browser
  │
  ├─ Deposit  ── player signs SPL transfer → POST /api/transactions/deposit  ──┐
  ├─ Withdraw ── POST /api/transactions/withdraw ──────────────────────────────┤
  └─ Purchase ── POST /api/transactions/purchase ─────────────────────────────►│
                                                                                ▼
                                                              transactions_pending (MongoDB)
                                                              { type, signature, walletAddress,
                                                                status: pending|failed|dead,
                                                                retryCount, lastError, ... }
                                                                                │
                                                          server/solana-smart-contract/
                                                          workers/drain.worker.ts
                                                          polls every 5 s, oldest-first
                                                                                │
                                              ┌─────────────────────────────────┤
                                              │                                 │
                                    chain/solana/                      chain/hive/ | chain/robinhood/
                                    verify + transfer                  (unchanged for fallback)
                                              │
                                              ▼
                                    transactions_processed  ◄──── immutable settlement ledger
                                    { txHash, wallet, type, amount, processedAt }
                                              │
                                              ▼
                                    Player.coins $inc  (atomic, idempotency via txHash)
                                    Socket notify → browser polls
```

---

## 2. New Collections

### 2a. `transactions_pending`

**File:** `lib/modules/transactions-pending/model.server.ts`

```typescript
// Types
export type PendingTxStatus = 'pending' | 'failed' | 'dead'
export type PendingTxType   = 'deposit' | 'withdrawal' | 'purchase'

interface IPendingTransaction extends Document {
  type:          PendingTxType
  /**
   * Idempotency key — unique across the queue.
   * - deposit/purchase: the on-chain transfer signature (txId) the player signed.
   * - withdrawal: a server-generated UUID.
   */
  signature:     string          // unique index
  walletAddress: string          // player's Solana / Hive / Robinhood address

  // deposit / purchase fields
  amount?:       number          // token amount the player sent to treasury
  itemId?:       string          // for purchase: card/pack identifier

  // withdrawal fields
  withdrawAmount?: number        // whole coins requested

  // lifecycle
  status:        PendingTxStatus
  retryCount:    number
  lastError?:    string

  createdAt:     Date
  updatedAt:     Date
}
```

**Indexes:**
- `{ signature: 1 }` — unique (idempotency key)
- `{ status: 1, createdAt: 1 }` — drain index (worker queries `{ status: { $in: ["pending","failed"] } }` oldest-first)

**Collection name:** `transactions_pending`

---

### 2b. `transactions_processed`

**File:** `lib/modules/transactions-processed/model.server.ts`

```typescript
export type ProcessedTxType = 'deposit' | 'withdrawal' | 'purchase'

interface IProcessedTransaction extends Document {
  /**
   * On-chain signature (Solana base58) or Hive tx id — unique idempotency guard.
   * For withdrawals this is the treasury→player on-chain signature returned by sendTokens().
   */
  txHash:      string    // unique index
  wallet:      string    // player wallet address
  type:        ProcessedTxType
  /**
   * Net coin delta applied to the player.
   * Positive for deposits/purchases-credit, negative for withdrawals.
   */
  amount:      number
  processedAt: number    // Unix ms
}
```

**Indexes:**
- `{ txHash: 1 }` — unique (idempotency guard — `claimProcessedTransaction` uses this)
- `{ wallet: 1, processedAt: -1 }` — per-player history, newest-first (GET /api/transactions)

**Collection name:** `transactions_processed`

---

## 3. Repository Layer

### 3a. `lib/modules/transactions-pending/repository.server.ts`

Functions to implement (modelled on boom-miner):

| Function | Purpose |
|---|---|
| `enqueueDeposit({ walletAddress, txId, amount })` | Drops a deposit row. `signature = txId`. Handles E11000 as `duplicate: true`. |
| `enqueueWithdrawal({ walletAddress, withdrawAmount })` | Drops a withdrawal row. `signature = randomUUID()`. Returns `{ jobId, signature }`. |
| `enqueuePurchase({ walletAddress, txId, amount, itemId })` | Drops a purchase row. `signature = txId`. Handles E11000 as `duplicate: true`. |
| `listPendingOldestFirst(limit?)` | Returns `pending \| failed` rows sorted by `createdAt` asc. Used by drain worker. |
| `completeJob(id)` | Deletes the row on terminal success. |
| `failJob(id, message, maxRetries?)` | Increments `retryCount`, stores `lastError`, flips to `dead` if `retryCount >= maxRetries`. Returns `deadLettered: boolean`. |
| `countJobsByStatus()` | Aggregates `{ pending: N, failed: N, dead: N }` — for worker heartbeat logs. |

### 3b. `lib/modules/transactions-processed/repository.server.ts`

Functions to implement (modelled on boom-miner):

| Function | Purpose |
|---|---|
| `claimProcessedTransaction({ txHash, wallet, type, amount })` | Inserts ledger row. Returns `{ claimed: true }` on success, `{ claimed: false }` on E11000. Used by deposit/purchase drain to guarantee at-most-once credit. |
| `insertProcessedTransaction(input)` | Same as claim but swallows the E11000 silently. Used by withdrawal drain (treasury already sent tokens — always record). |
| `isTransactionProcessed(txHash)` | Quick existence check. |
| `getTransactionHistory(wallet, limit, cursor?, type?)` | Keyset-paginated history, newest-first. Returns `{ transactions, nextCursor }`. |

---

## 4. Chain Layer — `server/solana-smart-contract/chain/`

Create the directory `server/solana-smart-contract/` to house all Solana-specific server logic.
The three chain adapters live under `server/solana-smart-contract/chain/`.

### Chain Switch Pattern (from boom-miner config)

```
NEXT_PUBLIC_CHAIN=solana   # or hive | robinhood
```

All drain workers call a `getChain()` dispatcher that routes to the correct adapter:

```typescript
// server/solana-smart-contract/chain/index.ts
import * as solana    from './solana'
import * as hive      from './hive'
import * as robinhood from './robinhood'

export function getChain() {
  const chain = process.env.NEXT_PUBLIC_CHAIN ?? 'solana'
  if (chain === 'hive')      return hive
  if (chain === 'robinhood') return robinhood
  return solana  // default
}
```

Each chain module exposes the same interface:

```typescript
interface ChainAdapter {
  // Treasury → player payout (withdrawal)
  sendWithdrawal(playerAddress: string, amount: number, ref: string): Promise<{ txHash: string }>
  // Verify a player → treasury on-chain transfer (deposit / purchase)
  verifyDeposit(txId: string, playerAddress: string, expectedAmount: number): Promise<DepositVerification>
}
```

---

### 4a. `server/solana-smart-contract/chain/solana/`

Ported directly from boom-miner `lib/chain/solana/`. Key files:

#### `rpc.ts`
- `getConnection()` — lazy `Connection` singleton. Uses `HELIUS_API_KEY` for the server RPC
  (reliable, higher rate limits) and `SOLANA_RPC_URL` as the public browser endpoint.
- `getTreasuryKeypair()` — decodes `TREASURY_KEY` (supports both base58 string and
  `[byte, …]` JSON array formats from solana-keygen / Phantom export).
- `getMintPublicKey()` — returns `new PublicKey(CONTRACT_ADDRESS)`.
- `getMintDecimals()` — fetches live decimals via `getMint()` with `TOKEN_2022_PROGRAM_ID`
  (required for Pump.fun / Token-2022 mints).

#### `transfer.ts` — `sendTokens()` / `sendWithdrawal()`
- Resolves treasury and recipient ATAs via `getOrCreateAssociatedTokenAccount()`.
  Treasury pays rent for new recipient ATAs.
- Preflights treasury token balance before sending (throws `TREASURY_INSUFFICIENT` on shortfall).
- Builds a `transferChecked` instruction + SPL Memo instruction.
- Calls `sendAndConfirmTransaction` with `commitment: "confirmed"`.
- Returns `{ signature: string }` (base58 Solana tx signature).

#### `verify.ts` — `verifyDepositFromPlayer()`
- Polls `getParsedTransaction()` with retries (configurable `maxTries` / `delayMs`).
- Asserts: tx is confirmed, player wallet signed, treasury token balance delta ===
  `expectedAmount` in base units (uses `preTokenBalances` / `postTokenBalances` delta,
  robust to ATA-creation side-effects).
- Returns `{ valid: true }` or `{ valid: false, code: "NOT_CONFIRMED" | "INVALID", reason }`.

#### `memo.ts`
- `buildDepositMemo(ref)` → `"idleraiders:deposit:<ref>"`
- `buildWithdrawMemo(ref)` → `"idleraiders:withdraw:<ref>"`
- `buildPurchaseMemo(ref)` → `"idleraiders:purchase:<ref>"`
- `buildMemoInstruction(memo)` — returns a `TransactionInstruction` for the
  SPL Memo program (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`).

---

### 4b. `server/solana-smart-contract/chain/hive/`

Thin wrappers over the existing `lib/modules/transactions/transaction.blockchain.ts` Hive logic,
conforming to the `ChainAdapter` interface:

- `sendWithdrawal()` → calls `broadcastHiveEngineTransfer()` (already implemented).
- `verifyDeposit()` → calls `validateHiveEngineDeposit()` (already implemented).

No logic changes to the existing Hive code — just re-export through the adapter interface.

---

### 4c. `server/solana-smart-contract/chain/robinhood/`

EVM / ethers.js adapter. Ported from boom-miner `lib/chain/robinhood/`:

- `rpc.ts` — `getTreasuryWallet()` (ethers `Wallet` from `ROBINHOOD_PRIVATE_KEY`),
  `getTokenContract()` (ERC-20 with `balanceOf` / `transfer`).
- `transfer.ts` — `sendTokens()` / `sendWithdrawal()`.
  Preflights balance, calls `token.transfer()`, waits 1 confirmation.
- `verify.ts` — `verifyDepositFromPlayer()`. Reads ERC-20 `Transfer` event from receipt,
  asserts `from === playerAddress`, `to === treasuryAddress`, `value === expectedAmount`.
- `memo.ts` — `buildWithdrawMemo()` / `encodeMemoHex()` (UTF-8 hex for `data` field).

---

## 5. Drain Workers — `server/solana-smart-contract/workers/`

### 5a. `drain.worker.ts` — main polling loop

Replaces the current `server/workers/transaction.worker.ts` for the new pending queue.

```
poll every 5 s
  ↓
listPendingOldestFirst(10)
  ↓
for each job:
  switch job.type:
    'deposit'    → drainDeposit(job)
    'withdrawal' → drainWithdrawal(job)
    'purchase'   → drainPurchase(job)
  on success → completeJob(job._id)
  on retryable error → failJob(job._id, error.message)
  on terminal error  → failJob with maxRetries=0 → dead
```

Worker lifecycle:
```typescript
export function initializeDrainWorker(io: Server): void
export async function closeDrainWorker(): Promise<void>
```

Integrated into `server/workers/index.ts` alongside existing workers.

---

### 5b. Deposit drain (`drainDeposit`)

```
1. verifyDeposit(job.signature, job.walletAddress, job.amount)
   ├── { valid: false, code: "NOT_CONFIRMED" } → retryable → failJob
   └── { valid: false, code: "INVALID" }       → terminal  → failJob (maxRetries=0)

2. claimProcessedTransaction({ txHash: job.signature, wallet: job.walletAddress,
                                type: 'deposit', amount: job.amount })
   ├── { claimed: false } → already processed → completeJob (idempotent)
   └── { claimed: true  } → continue

3. Player.findOneAndUpdate({ walletAddress: job.walletAddress },
   { $inc: { coins: job.amount } }, { new: true })
   — player lookup is by walletAddress (new field) with username fallback

4. completeJob(job._id)

5. Socket notify → updated_user_state { coins }
```

---

### 5c. Withdrawal drain (`drainWithdrawal`)

```
1. Atomic balance deduction (only on first attempt, checkpoint: 'balanceDeducted')
   Player.findOneAndUpdate({ walletAddress, coins: { $gte: withdrawAmount } },
   { $inc: { coins: -withdrawAmount } })
   └── null → INSUFFICIENT_BALANCE → failJob (terminal)

2. sendWithdrawal(job.walletAddress, job.withdrawAmount, job.signature)
   → returns { txHash }
   └── TREASURY_INSUFFICIENT → retryable failJob

3. insertProcessedTransaction({ txHash, wallet: job.walletAddress,
                                 type: 'withdrawal', amount: -job.withdrawAmount })

4. completeJob(job._id)

5. Socket notify → updated_user_state { coins }
```

**Critical idempotency rule (from boom-miner):**
If step 2 succeeds (tokens are on-chain) but step 3/4 fail, the worker must NOT refund.
The `chainTxId` checkpoint pattern from the current processor is preserved:
if `job.metadata.chainTxId` is set, skip the `sendWithdrawal` call (already sent).

---

### 5d. Purchase drain (`drainPurchase`)

Purchase = player paid tokens to treasury on-chain to buy something in-game (card pack, etc.).

```
1. verifyDeposit(job.signature, job.walletAddress, job.amount)
   — same verification flow as deposit drain

2. claimProcessedTransaction({ txHash: job.signature, wallet: job.walletAddress,
                                type: 'purchase', amount: job.amount })
   ├── { claimed: false } → already processed → completeJob
   └── { claimed: true  } → continue

3. Apply game-side purchase effect:
   switch job.itemId:
     'card_pack' → CardService.awardPack(job.walletAddress)
     (future items TBD)

4. completeJob(job._id)

5. Socket notify → transaction_success { type: 'purchase', itemId }
```

---

## 6. API Routes

### 6a. `app/api/transactions/deposit/route.ts` — POST

**Flow:**
1. Authenticate wallet (JWT `walletAddress` claim).
2. Parse body `{ txId: string, amount: number }`.
3. Validate: `txId` non-empty, `amount` integer >= 1.
4. `enqueueDeposit({ walletAddress, txId, amount })`.
   - Returns `{ status: 'queued', jobId, duplicate }` — 202.
   - `duplicate: true` means the same on-chain tx was already enqueued/processed (idempotent).

### 6b. `app/api/transactions/withdraw/route.ts` — POST

**Flow:**
1. Authenticate wallet.
2. Parse body `{ amount: number }`.
3. Validate: integer >= 1.
4. Pre-check player coin balance (fast fail — authoritative check runs again in the worker).
5. `enqueueWithdrawal({ walletAddress, withdrawAmount: amount })`.
6. Return `{ status: 'queued', jobId }` — 202.

### 6c. `app/api/transactions/purchase/route.ts` — POST

**Flow:**
1. Authenticate wallet.
2. Parse body `{ txId: string, amount: number, itemId: string }`.
3. Validate shape.
4. `enqueuePurchase({ walletAddress, txId, amount, itemId })`.
5. Return `{ status: 'queued', jobId, duplicate }` — 202.

### 6d. `app/api/transactions/route.ts` — GET

Paginated settlement history for the authenticated wallet.

```
GET /api/transactions?limit=25&cursor=<processedAt>&type=deposit|withdrawal|purchase
```

- Reads from `transactions_processed` via `getTransactionHistory()`.
- Returns `{ transactions, nextCursor }`.
- Browser polls this after enqueuing to detect settlement.

---

## 7. Config Changes

### `lib/config/config.ts` — full rewrite

The current config is a flat set of named exports (`MONGO_URI`, `HIVE_ACTIVE_KEY`, etc.).
Replace with a structured singleton matching boom-miner's pattern, adding Solana and Robinhood:

```typescript
export type SupportedChain = 'solana' | 'hive' | 'robinhood'

export const config = {
  mongoUri:  process.env.MONGO_URI ?? process.env.MONGO_URI_LOCAL!,
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',

  withdrawal: {
    workerPollMs: 5000,
    maxRetries:   8,
  },

  blockchain: {
    chain:           resolveChain(),         // NEXT_PUBLIC_CHAIN env var
    contractAddress: process.env.CONTRACT_ADDRESS!,
    treasuryAddress: process.env.TREASURY_ADDRESS!,
    treasuryKey:     process.env.TREASURY_KEY!,

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
      rpcNodes:     (process.env.HIVE_RPC_NODES ?? 'https://api.hive.blog').split(',').map(s => s.trim()),
      engineRpcUrl: process.env.HIVE_ENGINE_RPC_URL ?? 'https://api.hive-engine.com/rpc',
      engineId:     process.env.HIVE_ENGINE_ID ?? 'ssc-mainnet-hive',
      tokenSymbol:  process.env.HIVE_TOKEN_SYMBOL ?? process.env.CONTRACT_ADDRESS ?? '',
      precision:    Number(process.env.HIVE_TOKEN_PRECISION ?? 8),
      activeKey:    process.env.HIVE_ACTIVE_KEY ?? '',
      account:      process.env.GAME_ACCOUNT_NAME ?? 'idleraiders',
    },
  },
}
```

All existing named exports (`HIVE_ACTIVE_KEY`, `GAME_ACCOUNT_NAME`, etc.) become re-exports
from `config.blockchain.hive.*` to avoid breaking existing callers during the transition.

---

## 8. Player Model Changes

Add `walletAddress` to `IPlayer` and `PlayerSchema` to support Solana-native authentication
(wallet-address-based identity, no username required for the new transaction flows):

```typescript
// Add to IPlayer interface:
walletAddress?: string   // Solana / Robinhood public key or Hive username

// Add to PlayerSchema:
walletAddress: { type: String, index: true, sparse: true }
```

The player lookup in drain workers uses `walletAddress` first, falls back to `username`
for legacy Hive players. This is **additive** — no existing player data is altered.

---

## 9. Client-Side Deposit Flow (Solana)

**New file:** `lib/client/solana/deposit.ts` (ported from boom-miner)

The browser-side SPL token transfer: player signs a `transferChecked` instruction
sending tokens from their ATA to the treasury ATA, optionally with a memo instruction.
Returns `txId` (base58 Solana signature) which the browser then POSTs to
`/api/transactions/deposit`.

Steps:
1. Connect wallet via Wallet Standard (`standard:connect`).
2. Derive player and treasury ATAs via `getAssociatedTokenAddress()`.
3. Create treasury ATA instruction if it does not exist (player pays rent).
4. Build `transferChecked` + optional memo instruction.
5. Sign and send via `solana:signAndSendTransaction`.
6. Return `{ txId: bs58.encode(result.signature) }`.

The browser **never mints** or writes game state — it only moves tokens on-chain
and hands the signature to the server.

---

## 10. New Environment Variables

| Variable | Purpose | Required for |
|---|---|---|
| `NEXT_PUBLIC_CHAIN` | Active chain (`solana`\|`hive`\|`robinhood`) | All |
| `CONTRACT_ADDRESS` | SPL mint address (Solana) or ERC-20 address (Robinhood) | Solana/Robinhood |
| `TREASURY_ADDRESS` | Treasury wallet public key | All |
| `TREASURY_KEY` | Treasury keypair (base58 or JSON array for Solana; private key hex for Robinhood) | Solana/Robinhood |
| `SOLANA_RPC_URL` | Public Solana JSON-RPC (sent to browser) | Solana |
| `HELIUS_API_KEY` | Server-only Helius RPC (reliable payout + verification) | Solana (recommended) |
| `ROBINHOOD_RPC_URL` | Robinhood Chain JSON-RPC | Robinhood |
| `ROBINHOOD_CHAIN_ID` | Robinhood EVM chain id (default 4663) | Robinhood |
| `ROBINHOOD_TOKEN_ADDRESS` | ERC-20 token contract | Robinhood |
| `ROBINHOOD_TOKEN_DECIMALS` | ERC-20 decimal places (default 18) | Robinhood |
| `HIVE_TOKEN_SYMBOL` | Hive-Engine token symbol | Hive |
| `HIVE_TOKEN_PRECISION` | Token decimal places on Hive-Engine | Hive |
| `HIVE_ENGINE_RPC_URL` | Hive-Engine sidechain RPC | Hive |
| `HIVE_RPC_NODES` | Comma-separated Hive consensus nodes | Hive |

Existing variables (`HIVE_ACTIVE_KEY`, `GAME_ACCOUNT_NAME`, `MONGO_URI`, `JWT_SECRET`) are unchanged.

---

## 11. File Map

### New files to create

```
server/solana-smart-contract/
  chain/
    index.ts                      — chain dispatcher (getChain())
    solana/
      rpc.ts                      — Connection, getTreasuryKeypair, getMintPublicKey, getMintDecimals
      transfer.ts                 — sendTokens, sendWithdrawal
      verify.ts                   — verifyDepositFromPlayer
      memo.ts                     — buildDepositMemo, buildWithdrawMemo, buildPurchaseMemo, buildMemoInstruction
    hive/
      adapter.ts                  — thin wrapper over existing transaction.blockchain.ts
    robinhood/
      rpc.ts                      — getTreasuryWallet, getTokenContract
      transfer.ts                 — sendTokens, sendWithdrawal
      verify.ts                   — verifyDepositFromPlayer (ERC-20 Transfer event check)
      memo.ts                     — buildWithdrawMemo, encodeMemoHex
  workers/
    drain.worker.ts               — main polling loop (initializeDrainWorker, closeDrainWorker)
    drain.deposit.ts              — drainDeposit handler
    drain.withdrawal.ts           — drainWithdrawal handler
    drain.purchase.ts             — drainPurchase handler

lib/modules/transactions-pending/
  types.server.ts                 — IPendingTransaction, PendingTxStatus, PendingTxType
  model.server.ts                 — PendingTransactionModel (collection: transactions_pending)
  repository.server.ts            — enqueueDeposit, enqueueWithdrawal, enqueuePurchase,
                                    listPendingOldestFirst, completeJob, failJob, countJobsByStatus

lib/modules/transactions-processed/
  types.server.ts                 — IProcessedTransaction, ProcessedTxType
  model.server.ts                 — ProcessedTransactionModel (collection: transactions_processed)
  repository.server.ts            — claimProcessedTransaction, insertProcessedTransaction,
                                    isTransactionProcessed, getTransactionHistory

lib/client/solana/
  deposit.ts                      — browser-side SPL token transfer (client-only)

app/api/transactions/
  deposit/route.ts                — POST: enqueue deposit
  withdraw/route.ts               — POST: enqueue withdrawal
  purchase/route.ts               — POST: enqueue purchase
  route.ts                        — GET:  paginated settlement history
```

### Files to modify

```
lib/config/config.ts              — add structured blockchain config (Solana + Robinhood + Hive)
lib/modules/players/player.model.ts — add walletAddress field (sparse index, optional)
server/workers/index.ts           — register initializeDrainWorker alongside existing workers
```

### Files unchanged (do not touch)

```
lib/modules/transactions/transaction.model.ts      — legacy, keep running in parallel
lib/modules/transactions/transaction.processor.ts  — legacy, keep running in parallel
server/workers/transaction.worker.ts               — legacy, keep running in parallel
app/game/marketplace/page.tsx                      — follow REVISION_PLAN.md separately
```

---

## 12. Execution Order

Work in this order to avoid cascading compile errors and to keep the game live throughout:

1. **Add `walletAddress` to Player model** (additive, non-breaking).

2. **Create `lib/modules/transactions-pending/` module** — types, model, repository.

3. **Create `lib/modules/transactions-processed/` module** — types, model, repository.

4. **Create `lib/config/config.ts` structured config** — add Solana/Robinhood blocks,
   keep all existing named exports as re-exports for backward compatibility.

5. **Create `server/solana-smart-contract/chain/solana/`** — rpc, transfer, verify, memo.
   Depends on new config.

6. **Create `server/solana-smart-contract/chain/hive/adapter.ts`** — thin wrapper.

7. **Create `server/solana-smart-contract/chain/robinhood/`** — rpc, transfer, verify, memo.

8. **Create `server/solana-smart-contract/chain/index.ts`** — chain dispatcher.

9. **Create drain workers** — drain.deposit.ts, drain.withdrawal.ts, drain.purchase.ts,
   drain.worker.ts. Register in `server/workers/index.ts`.

10. **Create API routes** — `/api/transactions/deposit`, `/api/transactions/withdraw`,
    `/api/transactions/purchase`, `/api/transactions` (GET).

11. **Create `lib/client/solana/deposit.ts`** — browser-side deposit helper.

12. **Install new npm packages** (if not already present):
    - `@solana/web3.js`
    - `@solana/spl-token`
    - `bs58`
    - `ethers` (v6, for Robinhood)
    - `@wallet-standard/app`, `@wallet-standard/base`

---

## 13. Security Invariants

| Invariant | Enforcement |
|---|---|
| Treasury key never reaches the browser | `server/solana-smart-contract/chain/solana/rpc.ts` is server-only; never imported from `'use client'` files |
| Each on-chain tx can only be credited once | `claimProcessedTransaction` uses unique `txHash` index — E11000 = already claimed |
| Withdrawal cannot double-send | `job.metadata.chainTxId` checkpoint — worker skips `sendWithdrawal` if already set |
| Player cannot redirect a withdrawal to another wallet | Recipient is always the authenticated `walletAddress` from the JWT claim, never from the request body |
| Treasury preflight prevents on-chain revert | `sendTokens()` checks treasury ATA balance before signing; throws `TREASURY_INSUFFICIENT` |
| Deposit amount must match exactly | `verifyDepositFromPlayer()` checks `treasuryDelta === expectedRaw` in base units using token delta (not event data), robust to ATA creation side effects |

---

## 14. Notes

- **Solana is the default chain.** `NEXT_PUBLIC_CHAIN` defaults to `solana`. Hive and Robinhood
  are available via env var switch.
- **Hive adapter is a thin wrapper**, not a rewrite. The existing `transaction.blockchain.ts`
  Hive logic continues to work unchanged through the adapter interface.
- **The legacy `Transaction` collection continues to run** during the migration window. Both
  workers poll in parallel. Once the new system is proven in production, remove
  `transaction.worker.ts` and the `Transaction` model/processor in a cleanup PR.
- **No marketplace changes** are included in this plan per scope. The `market` field added to
  `card.model.ts` is independent and does not require any transaction collection changes.
- **`transactions_pending` dead-letter queue.** Jobs that exceed `maxRetries` (default 8) flip to
  `status: 'dead'`. They do not auto-retry. Operators resolve them via a future admin tool or
  direct DB query.
