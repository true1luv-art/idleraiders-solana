# Architecture Refactor Plan — Align to Boom-Miner

**Status: DRAFT — Review before implementation**

This document maps every current structural divergence between `idleraiders-solana` and the
`boom-miner` reference, explains why each one matters, and proposes the target layout.
It is not a migration guide — it is the plan you approve first.

---

## Table of Contents

1. [Core Architectural Principles from Boom-Miner](#1-core-architectural-principles-from-boom-miner)
2. [Layer Map — Current vs Target](#2-layer-map--current-vs-target)
3. [Section-by-Section Analysis](#3-section-by-section-analysis)
   - [3a. `lib/modules/` — Server Data Layer](#3a-libmodules--server-data-layer)
   - [3b. `features/` — Events, Actions, and Store](#3b-features--events-actions-and-store)
   - [3c. `context/` — Client State](#3c-context--client-state)
   - [3d. `hooks/` — Settlement Notifier and Derived State](#3d-hooks--settlement-notifier-and-derived-state)
   - [3e. `app/api/` — Route Handlers](#3e-appapi--route-handlers)
   - [3f. `components/` — UI Components](#3f-components--ui-components)
   - [3g. `server/` — Drain Worker](#3g-server--drain-worker)
   - [3h. Files to Remove](#3h-files-to-remove)
4. [Full Target Directory Tree](#4-full-target-directory-tree)
5. [File-by-File Rename and Move Table](#5-file-by-file-rename-and-move-table)
6. [Key Function Signature Changes](#6-key-function-signature-changes)
7. [What Does NOT Change](#7-what-does-not-change)
8. [Dependency Risk Notes](#8-dependency-risk-notes)

---

## 1. Core Architectural Principles from Boom-Miner

Before listing changes, these are the rules boom-miner enforces that idleraiders currently
does not fully follow:

### A. Strict `.server.ts` suffix for anything that touches the DB
All Mongoose models, repositories, and types that are **server-only** use the
`.server.ts` suffix. This prevents Next.js from accidentally bundling Mongoose into
the client. Idleraiders already does this for `transactions-pending` and
`transactions-processed` but does **not** do it for `player.model.ts`,
`mission.model.ts`, `card.model.ts`, etc.

### B. `lib/modules/<domain>/` contains exactly four files per domain
| File | Role |
|---|---|
| `model.server.ts` | Mongoose schema + model (server-only) |
| `repository.server.ts` | All DB calls — no Express, no logic, only I/O |
| `types.server.ts` | TypeScript interfaces/types for that domain |
| *(logic can live in repository for simple domains)* | *(or a separate `logic.ts` when complex)* |

Idleraiders currently mixes this with `player.service.ts`, `player.controller.ts`,
`player.builder.ts`, `player.logic.ts`, and `player.repository.ts` — five separate
files that overlap in responsibility.

### C. No Express controllers
Boom-miner has **no `*.controller.ts` files**. Route handlers (`app/api/.../route.ts`)
call repository or service functions directly. The `player.controller.ts` file in
idleraiders is an Express leftover with no role in Next.js App Router.

### D. `features/events/<event-name>/action.ts` for pure game logic
Any mutation that is **pure** (no I/O, operates on a state snapshot) lives under
`features/events/<event-name>/action.ts`. The route handler calls the pure function
first, then calls the repository to persist the result. This keeps logic testable
without a database.

### E. `features/store/` for client state (Zustand)
The single client-side state store lives at `features/store/gameStore.ts`. There is no
React Context for game state — Context is only used for auth (JWT token management).
Idleraiders currently uses `context/GameContext.tsx` for both auth and game state.

### F. `lib/api/` for shared API utilities only
Boom-miner puts two narrow utilities here: `error-response.ts` (typed `apiOk`/`apiError`
helpers) and `get-wallet.ts` (JWT verification). Idleraiders currently has
`lib/api/auth.ts` which mixes JWT verification with player lookup logic — these belong
in `lib/auth/` and `lib/modules/players/` respectively.

### G. `lib/auth/` for JWT + wallet adapter utilities
Wallet adapters (Hive, Solana) live under `lib/auth/wallet-adapters/`. JWT signing and
verification live at `lib/auth/jwt.ts`. Idleraiders has `lib/api/auth.ts` for this
instead.

### H. `lib/chain/` for on-chain read/write (server only)
All on-chain RPC calls — `transfer.ts`, `rpc.ts`, `verify.ts`, `memo.ts` — live under
`lib/chain/<blockchain>/`. Idleraiders has `lib/client/solana/deposit.ts` for the
client-side transaction build but puts server-side verification inside the drain
workers directly.

### I. `lib/client/<blockchain>/deposit.ts` for client-side tx building only
The client-side code that builds and signs a transaction for the user's wallet lives
under `lib/client/<blockchain>/deposit.ts`. Idleraiders already has
`lib/client/solana/deposit.ts` — this is correct and stays.

### J. `hooks/useSettlementNotifier.ts` for transaction polling
A single hook polls `GET /api/transactions`, diffs against a baseline, and notifies
the store about newly-settled transactions. Idleraiders does not have this hook yet
(the polling is partially inline in wallet actions). It needs to be added.

---

## 2. Layer Map — Current vs Target

```
CURRENT (idleraiders)                  TARGET (boom-miner aligned)
─────────────────────────────────────  ─────────────────────────────────────
context/
  AuthContext.tsx           KEEP       context/
  GameContext.tsx           REPLACE      AuthContext.tsx   (auth + JWT only)
  AudioContext.tsx          KEEP         AudioContext.tsx  (unchanged)
  index.ts                  UPDATE       index.ts

features/
  actions/                  SPLIT      features/
    missionActions.ts         →          events/
    walletActions.ts          →            mission-start/action.ts       (pure)
    playerActions.ts          →            mission-complete/action.ts    (pure)
    cardActions.ts            →            energy-regen/action.ts        (pure)
    itemActions.ts            →            card-drop/action.ts           (pure)
    packActions.ts            →          actions/                        (HTTP callers, keep)
    historyActions.ts         →            *.ts  (unchanged)
    marketActions.ts          →          store/
    apiClient.ts              KEEP         gameStore.ts                  (NEW — Zustand)
  images/                   KEEP         images/  (unchanged)

lib/
  modules/players/           RENAME     lib/
    player.model.ts     →                 modules/players/
    player.repository.ts →                 model.server.ts
    player.service.ts   →                  repository.server.ts   (merge service in)
    player.builder.ts   →                  types.server.ts
    player.controller.ts DELETE            logic.ts               (level/xp math)
    player.logic.ts     →
  modules/missions/          RENAME       modules/missions/
    mission.model.ts    →                  model.server.ts
    mission.repository.ts →                repository.server.ts
    mission.service.ts  →                  (service logic merged into repository)
    mission.logic.ts    →                  logic.ts               (keep — complex)
  modules/cards/             RENAME       modules/cards/
    card.model.ts       →                  model.server.ts
    card.repository.ts  →                  repository.server.ts
    card.service.ts     →                  (service merged in)
    card.logic.ts       →                  logic.ts
  modules/histories/         RENAME       modules/histories/
    history.model.ts    →                  model.server.ts
    history.repository.ts →                repository.server.ts
    history.service.ts  →                  (thin — merge into repository)
  modules/items/             RENAME       modules/items/
    item.service.ts     →                  repository.server.ts   (rename)
  modules/transactions-*     KEEP         modules/transactions-*/  (already correct)

  api/
    auth.ts             SPLIT          lib/
                                         api/
                                           error-response.ts  (apiOk / apiError)
                                           get-player.ts      (JWT → player)
                                         auth/
                                           jwt.ts             (sign / verify)
                                           wallet-adapters/
                                             hive.ts          (existing)
                                             solana.ts        (NEW stub)

  config/               KEEP           lib/config/   (unchanged)
  registries/           KEEP           lib/registries/  (unchanged)
  utils/                KEEP           lib/utils/  (unchanged)
  types/index.ts        KEEP           lib/types/  (unchanged)
  formatters.ts         KEEP
  rarityStyles.ts       KEEP
  utils.ts              KEEP

hooks/
  useAuthCheck.ts        KEEP          hooks/
  useBlockchain.ts       KEEP            useAuthCheck.ts
  useHiveKeychain.ts     KEEP            useBlockchain.ts
  usePlayer.ts           REPLACE         useHiveKeychain.ts
  useTimer.ts            KEEP            usePlayer.ts     (reads gameStore, not GameContext)
  use-mobile.ts          KEEP            useTimer.ts
  use-toast.ts           KEEP            use-mobile.ts
                                         use-toast.ts
                         ADD             useSettlementNotifier.ts   (NEW)

server/
  sockets/               DELETE      server/
    socket.manager.ts    DELETE        solana-smart-contract/
  server.ts              SIMPLIFY       workers/
  workers/               KEEP              drain.deposit.ts
  solana-smart-contract/ KEEP              drain.withdrawal.ts
                                           drain.purchase.ts
                                           drain.worker.ts
                                         lib/
                                           logger.ts
                                       workers/
                                         index.ts
                                       server.ts   (HTTP health only)

components/
  modals/Registration.tsx  DELETE    components/
  modals/Others            KEEP        modals/
  popover/                 KEEP        popover/
  game/                    KEEP        game/
  ui/                      KEEP        ui/
  *.tsx (root-level)       KEEP        *.tsx
```

---

## 3. Section-by-Section Analysis

### 3a. `lib/modules/` — Server Data Layer

#### Problem
Each domain currently has 3–5 files with overlapping responsibilities:
- `*.service.ts` — contains both business logic AND database calls
- `*.controller.ts` — Express adapter (dead code in Next.js)
- `*.repository.ts` — sometimes just re-exports from model, sometimes has real logic
- `*.builder.ts` — utility that computes derived values (belongs in `logic.ts`)
- `*.logic.ts` — pure computation (correct, keep these)
- `*.model.ts` — no `.server.ts` suffix (risks client bundle contamination)

#### Target pattern (from boom-miner)
```
lib/modules/<domain>/
  model.server.ts        ← Mongoose schema + model export
  repository.server.ts   ← All DB reads/writes + any business logic
  types.server.ts        ← TypeScript interfaces (IPlayer, IMission, etc.)
  logic.ts               ← Pure functions (no DB, no I/O) — keep when complex
```

#### Changes per domain

**`players/`**
| Current file | Action | Destination |
|---|---|---|
| `player.model.ts` | Rename | `model.server.ts` |
| `player.repository.ts` | Rename | `repository.server.ts` |
| `player.service.ts` | Merge into | `repository.server.ts` |
| `player.builder.ts` | Merge into | `repository.server.ts` or `logic.ts` |
| `player.logic.ts` | Rename | `logic.ts` |
| `player.controller.ts` | **DELETE** | — (Express leftover, unused in App Router) |

**`missions/`**
| Current file | Action | Destination |
|---|---|---|
| `mission.model.ts` | Rename | `model.server.ts` |
| `mission.repository.ts` | Rename | `repository.server.ts` |
| `mission.service.ts` | Merge into | `repository.server.ts` |
| `mission.logic.ts` | Rename | `logic.ts` |

**`cards/`**
| Current file | Action | Destination |
|---|---|---|
| `card.model.ts` | Rename | `model.server.ts` |
| `card.repository.ts` | Rename | `repository.server.ts` |
| `card.service.ts` | Merge into | `repository.server.ts` |
| `card.logic.ts` | Rename | `logic.ts` |

**`histories/`**
| Current file | Action | Destination |
|---|---|---|
| `history.model.ts` | Rename | `model.server.ts` |
| `history.repository.ts` | Rename | `repository.server.ts` |
| `history.service.ts` | Merge into | `repository.server.ts` (it's thin) |
| `history.logic.ts` | Rename | `logic.ts` |

**`items/`**
| Current file | Action | Destination |
|---|---|---|
| `item.service.ts` | Rename | `repository.server.ts` (no model needed — items are static game data) |

**`transactions-pending/` and `transactions-processed/`**
Already follow the boom-miner pattern exactly (`model.server.ts`, `repository.server.ts`,
`types.server.ts`). No changes needed.

---

### 3b. `features/` — Events, Actions, and Store

#### Problem

`features/actions/` currently holds two different things:
1. **HTTP callers** (`missionActions.ts`, `walletActions.ts`, etc.) — these call
   `/api/*` and belong in `features/actions/`. They are correct.
2. **Business logic** that should be pure functions (`energyCost`, `missionStart`
   validation, card drop roll) — these are currently embedded in route handlers and
   service files, not in `features/`.

There is no Zustand store. Client state lives entirely in `GameContext` via `useState`,
which makes it impossible to read game state outside React components.

#### Target: Add `features/events/` and `features/store/`

**`features/events/<event-name>/action.ts`** — Pure event functions, no I/O.
These are the idleraiders equivalents of boom-miner's `hero-deploy/action.ts`.

Priority events to extract:
```
features/events/
  mission-start/
    action.ts      ← validates energy, dungeon lock, active-mission guard; returns ok/error
    action.test.ts
  mission-complete/
    action.ts      ← computes rewards (tokens, xp, card drop roll) from a state snapshot
    action.test.ts
  energy-regen/
    action.ts      ← computes regenerated energy from elapsed time + boost multiplier
    action.test.ts
  card-drop/
    action.ts      ← roll card drop given territory drop rate + card boost %
    action.test.ts
  pack-open/
    action.ts      ← resolve pack contents from rarity distribution
    action.test.ts
```

**`features/store/gameStore.ts`** — Single Zustand store for all client game state.
Replaces `GameContext` game-state portion. Mirrors boom-miner's `gameStore.ts`.

Key fields for idleraiders:
```typescript
interface GameState {
  // Auth (hydrated from AuthContext on login)
  username: string | null

  // Player
  coins: number
  energy: number
  maxEnergy: number
  level: number
  xp: number
  isRegistered: boolean
  activeMission: ActiveMission | null

  // Inventory
  inventory: InventoryItem[]
  cards: PlayerCard[]

  // Bootstrap
  bootstrapped: boolean

  // Settlement tracking (mirrors boom-miner)
  lastDepositTxHash: string | null
  lastWithdrawalTxHash: string | null
  lastPurchaseTxHash: string | null
  setSettlement: (type: 'deposit' | 'withdrawal' | 'purchase', txHash: string) => void

  // Hydration
  hydrate: (payload: BootstrapPayload) => void
  patchPlayer: (delta: Partial<PlayerState>) => void
  reconcile: (patch: Partial<PlayerState>) => void
}
```

---

### 3c. `context/` — Client State

#### Problem

`GameContext.tsx` currently does three things:
1. Holds all player state (`playerState`, `patchPlayerState`, `setPlayerState`)
2. Exposes the `apiRequest` helper (authenticated fetch wrapper)
3. Triggers `fetchPlayerState` on login

In boom-miner, the Context layer is **only** used for auth (token storage, isAuthenticated
flag). Game state lives in `features/store/gameStore.ts`.

#### Target

`context/AuthContext.tsx` — no changes. Keeps: `isAuthenticated`, `getAuthToken`,
`setRegistered`, login/logout.

`context/GameContext.tsx` — **replace** with a thin bootstrap provider that:
1. Calls `GET /api/players/state` after login (replacing the bootstrap route that
   doesn't exist yet in idleraiders)
2. Calls `gameStore.hydrate(payload)` with the result
3. Exposes nothing except `isLoading` and `apiRequest` (the HTTP helper)

The large `PlayerState` interface and all `playerState.*` reads throughout the codebase
will be replaced with `useGameStore((s) => s.<field>)` calls.

---

### 3d. `hooks/` — Settlement Notifier and Derived State

#### Problem

`hooks/usePlayer.ts` reads from `GameContext` (`useGame()`) which couples all
consumers to the Context. In boom-miner, similar derived-state hooks read from the
Zustand store directly.

`useSettlementNotifier` does not exist. The wallet page currently fetches its own
HIVE price but there is no central hook that polls `/api/transactions` for deposit/
withdrawal/purchase settlements and notifies the store.

#### Target

`hooks/usePlayer.ts` — update to read from `useGameStore` instead of `useGame()`.

`hooks/useSettlementNotifier.ts` — **add new hook** (port from boom-miner, adapted for
idleraiders' three transaction types: deposit, withdrawal, purchase). Poll
`GET /api/transactions`, diff against baseline, call `gameStore.setSettlement()` on
new rows, then trigger a player state refresh via `fetchPlayerState()`.

---

### 3e. `app/api/` — Route Handlers

#### Problem

Route handlers currently call `service.*` functions which mix DB logic and business
rules in the same layer. Some routes directly import from `*.model.ts` files without
the `.server.ts` suffix.

Additionally, `app/api/transactions/registration/route.ts` exists but registration is
free — this route should be removed or merged into `app/api/players/register/route.ts`.

There is no `GET /api/players/state` single-payload bootstrap route equivalent to
boom-miner's `GET /api/bootstrap`. The current `app/api/players/state/route.ts` returns
the player document but not energy, cards, inventory, or active mission in one call.

#### Target changes

| Current route | Action | Notes |
|---|---|---|
| `GET /api/players/state` | Expand | Return full bootstrap payload: player + energy + active mission + cards + inventory |
| `POST /api/players/login` | Keep | No change |
| `POST /api/players/register` | Keep | No change |
| `GET /api/players/me` | Evaluate | May be redundant with expanded `/state` |
| `GET /api/players/energy` | Keep | Used by energy bar polling |
| `DELETE /api/transactions/registration` | **Remove** | Registration is free — route is dead |
| `GET /api/transactions` | Keep | Used by `useSettlementNotifier` |
| `POST /api/transactions/deposit` | Keep | |
| `POST /api/transactions/withdraw` | Keep | |
| `POST /api/transactions/purchase` | Keep | |

All route handlers should import from `lib/modules/<domain>/repository.server.ts`,
not from `*.service.ts` or `*.model.ts` directly.

---

### 3f. `components/` — UI Components

#### Problem

`components/modals/Registration.tsx` is vestigial now that registration is free.
It should be removed.

`components/` root-level files (`ActiveMissionBar.tsx`, `BottomNavigation.tsx`,
`GameHeader.tsx`, etc.) do not have a sub-folder. Boom-miner organizes these under
`features/game-components/<area>/`.

#### Target

```
features/game-components/
  hud/
    GameHeader.tsx
    ActiveMissionBar.tsx
    BottomNavigation.tsx
    EnergyBar.tsx       (currently components/popover/EnergyBar.tsx)
    MissionTimer.tsx
    ProgressBar.tsx
  shell/
    GameShell.tsx       (currently app/game/layout.tsx inner wrapper)
  popover/
    Menu.tsx
    Wallet.tsx
  modals/
    BuyPackConfirm.tsx
    History.tsx
    Legal.tsx
    OpenPackConfirm.tsx
    Referrals.tsx
    Settings.tsx
    Training.tsx
    Tutorial.tsx
    ViewPlayerProfile.tsx
    (Registration.tsx — DELETE)
```

Note: Moving these is cosmetic. The priority is the module and store changes above.
This can be a separate pass.

---

### 3g. `server/` — Drain Worker

#### Problem

`server/sockets/` still exists (`socket.manager.ts`) even though sockets were removed.
The socket.io-client package is still in `package.json`.

#### Target

```
server/
  solana-smart-contract/
    workers/
      drain.deposit.ts
      drain.withdrawal.ts
      drain.purchase.ts
      drain.worker.ts
    lib/
      logger.ts
  workers/
    index.ts
  server.ts
```

Delete `server/sockets/` entirely. Remove `socket.io` and `socket.io-client` from
`package.json` once confirmed nothing imports them.

---

### 3h. Files to Remove

| File | Reason |
|---|---|
| `lib/modules/players/player.controller.ts` | Express adapter, unused in App Router |
| `components/modals/Registration.tsx` | Registration is free, no longer needed |
| `server/sockets/socket.manager.ts` | Sockets removed |
| `server/sockets/` (directory) | Sockets removed |
| `app/api/transactions/registration/route.ts` | Registration is free |

---

## 4. Full Target Directory Tree

```
app/
  api/
    cards/
      supply/route.ts
    history/route.ts
    items/
      packs/route.ts
      potion/route.ts
    missions/
      boss/route.ts
      complete/route.ts
      start/route.ts
    players/
      energy/route.ts
      login/route.ts
      me/route.ts
      profile/route.ts
      referrals/route.ts
      register/route.ts
      state/route.ts             ← expanded to return full bootstrap payload
      storage/route.ts
      version/route.ts
    transactions/
      deposit/route.ts
      purchase/route.ts
      withdraw/route.ts
      route.ts                   ← GET list (used by useSettlementNotifier)
      (registration/ — REMOVED)
  docs/page.tsx
  game/
    explore/page.tsx
    guild/page.tsx
    inventory/page.tsx
    layout.tsx
    marketplace/page.tsx
    packs/page.tsx
    page.tsx
    profile/page.tsx
    trader/page.tsx
    wallet/page.tsx
    world/page.tsx
  globals.css
  layout.tsx
  login/page.tsx
  page.tsx

components/
  game/
    world/
      BossTab.tsx
      DungeonTab.tsx
      StoryTab.tsx
  modals/
    BuyPackConfirm.tsx
    History.tsx
    Legal.tsx
    OpenPackConfirm.tsx
    Referrals.tsx
    Settings.tsx
    Training.tsx
    Tutorial.tsx
    ViewPlayerProfile.tsx
    (Registration.tsx — DELETED)
  popover/
    EnergyBar.tsx
    Menu.tsx
    Wallet.tsx
  ui/
    ... (shadcn, unchanged)
  ActiveMissionBar.tsx
  BottomNavigation.tsx
  CurrencyIcon.tsx
  GameHeader.tsx
  GlobalFilter.tsx
  Maintenance.tsx
  MissionTimer.tsx
  ProgressBar.tsx
  theme-provider.tsx

context/
  AudioContext.tsx
  AuthContext.tsx
  GameContext.tsx              ← thin bootstrap + apiRequest only (no playerState)
  index.ts

features/
  actions/
    apiClient.ts
    cardActions.ts
    historyActions.ts
    index.ts
    itemActions.ts
    marketActions.ts
    missionActions.ts
    packActions.ts
    playerActions.ts
    walletActions.ts
  events/                      ← NEW: pure game logic, each with action.ts + action.test.ts
    card-drop/
      action.ts
      action.test.ts
    energy-regen/
      action.ts
      action.test.ts
    mission-complete/
      action.ts
      action.test.ts
    mission-start/
      action.ts
      action.test.ts
    pack-open/
      action.ts
      action.test.ts
  images/
    BoosterImages.ts
    BossImages.ts
    CardImages.ts
    DungeonImages.ts
    FrameImages.ts
    GameImages.ts
    TerritoryImages.ts
    index.ts
  store/                       ← NEW: Zustand game store
    gameStore.ts

hooks/
  use-mobile.ts
  use-toast.ts
  useAuthCheck.ts
  useBlockchain.ts
  useHiveKeychain.ts
  usePlayer.ts                 ← updated to read from gameStore
  useSettlementNotifier.ts     ← NEW
  useTimer.ts

lib/
  api/
    error-response.ts          ← NEW: apiOk / apiError helpers (from boom-miner)
    get-player.ts              ← NEW: JWT → player lookup (rename from lib/api/auth.ts)
  auth/
    jwt.ts                     ← JWT sign + verify (extracted from lib/api/auth.ts)
    wallet-adapters/
      hive.ts
  client/
    solana/
      deposit.ts
  config/
    config.ts
    database.ts
    discord.ts
    tokens.ts
  modules/
    cards/
      logic.ts                 ← rename from card.logic.ts
      model.server.ts          ← rename from card.model.ts
      repository.server.ts     ← merge card.repository.ts + card.service.ts
      types.server.ts          ← NEW: extract ICard interfaces
    histories/
      logic.ts
      model.server.ts
      repository.server.ts     ← merge history.repository.ts + history.service.ts
      types.server.ts
    items/
      repository.server.ts     ← rename from item.service.ts
    missions/
      logic.ts                 ← rename from mission.logic.ts
      model.server.ts          ← rename from mission.model.ts
      repository.server.ts     ← merge mission.repository.ts + mission.service.ts
      types.server.ts          ← NEW: extract IMission interfaces
    players/
      logic.ts                 ← rename from player.logic.ts
      model.server.ts          ← rename from player.model.ts
      repository.server.ts     ← merge player.repository.ts + player.service.ts + player.builder.ts
      types.server.ts          ← NEW: extract IPlayer interface
      (player.controller.ts — DELETED)
    transactions-pending/
      model.server.ts          ← no change
      repository.server.ts     ← no change
      types.server.ts          ← no change
    transactions-processed/
      model.server.ts          ← no change
      repository.server.ts     ← no change
      types.server.ts          ← no change
  registries/
    card.registry.ts
    item.registry.ts
  types/
    index.ts
  utils/
    logger.ts
    time.ts
  formatters.ts
  rarityStyles.ts
  utils.ts

server/
  solana-smart-contract/
    lib/
      logger.ts
    workers/
      drain.deposit.ts
      drain.withdrawal.ts
      drain.purchase.ts
      drain.worker.ts
  workers/
    index.ts
  server.ts
  (sockets/ — DELETED)

public/
  assets/
    ...
  data/
    ...
```

---

## 5. File-by-File Rename and Move Table

| Current path | Target path | Action |
|---|---|---|
| `lib/modules/players/player.model.ts` | `lib/modules/players/model.server.ts` | Rename |
| `lib/modules/players/player.repository.ts` | `lib/modules/players/repository.server.ts` | Rename |
| `lib/modules/players/player.service.ts` | Merge → `repository.server.ts` | Merge + delete |
| `lib/modules/players/player.builder.ts` | Merge → `repository.server.ts` | Merge + delete |
| `lib/modules/players/player.logic.ts` | `lib/modules/players/logic.ts` | Rename |
| `lib/modules/players/player.controller.ts` | — | **DELETE** |
| `lib/modules/missions/mission.model.ts` | `lib/modules/missions/model.server.ts` | Rename |
| `lib/modules/missions/mission.repository.ts` | `lib/modules/missions/repository.server.ts` | Rename |
| `lib/modules/missions/mission.service.ts` | Merge → `repository.server.ts` | Merge + delete |
| `lib/modules/missions/mission.logic.ts` | `lib/modules/missions/logic.ts` | Rename |
| `lib/modules/cards/card.model.ts` | `lib/modules/cards/model.server.ts` | Rename |
| `lib/modules/cards/card.repository.ts` | `lib/modules/cards/repository.server.ts` | Rename |
| `lib/modules/cards/card.service.ts` | Merge → `repository.server.ts` | Merge + delete |
| `lib/modules/cards/card.logic.ts` | `lib/modules/cards/logic.ts` | Rename |
| `lib/modules/histories/history.model.ts` | `lib/modules/histories/model.server.ts` | Rename |
| `lib/modules/histories/history.repository.ts` | `lib/modules/histories/repository.server.ts` | Rename |
| `lib/modules/histories/history.service.ts` | Merge → `repository.server.ts` | Merge + delete |
| `lib/modules/histories/history.logic.ts` | `lib/modules/histories/logic.ts` | Rename |
| `lib/modules/items/item.service.ts` | `lib/modules/items/repository.server.ts` | Rename |
| `lib/api/auth.ts` | Split: `lib/auth/jwt.ts` + `lib/api/get-player.ts` | Split + delete |
| `context/GameContext.tsx` | Keep path, rewrite contents | Rewrite |
| `hooks/usePlayer.ts` | Keep path, update imports | Update |
| `server/sockets/socket.manager.ts` | — | **DELETE** |
| `components/modals/Registration.tsx` | — | **DELETE** |
| `app/api/transactions/registration/route.ts` | — | **DELETE** |

New files to create:
| Target path | Source |
|---|---|
| `lib/api/error-response.ts` | Port from boom-miner |
| `lib/api/get-player.ts` | Extract from `lib/api/auth.ts` |
| `lib/auth/jwt.ts` | Extract from `lib/api/auth.ts` |
| `lib/modules/*/types.server.ts` | Extract from model files |
| `features/store/gameStore.ts` | New — Zustand, replace GameContext game state |
| `features/events/*/action.ts` | Extract pure logic from service files |
| `hooks/useSettlementNotifier.ts` | Port from boom-miner, adapt for 3 tx types |

---

## 6. Key Function Signature Changes

These are the most impactful internal API changes. All call sites must be updated.

### Players repository
```typescript
// BEFORE: scattered across player.repository.ts + player.service.ts
import * as playerService from './player.service'
playerService.loginPlayer(username, signature, referral)
playerService.updateCoins(playerId, amount)
playerService.addXp(playerId, amount)

// AFTER: single import from repository.server.ts (boom-miner pattern)
import { loginPlayer, addCoins, deductCoins, addXp } from '@/lib/modules/players/repository.server'
```

### Missions
```typescript
// BEFORE
import * as missionService from './mission.service'
missionService.startMission(playerId, sourceId, missionTypeId, opts)

// AFTER (repository owns the logic, route calls it directly)
import { startMission, completeMission } from '@/lib/modules/missions/repository.server'
```

### API helpers
```typescript
// BEFORE
res.json({ success: true, data })
res.status(400).json({ success: false, error: message })

// AFTER (boom-miner pattern)
import { apiOk, apiError } from '@/lib/api/error-response'
return apiOk({ data })
return apiError(message, 'ERROR_CODE', 400)
```

### Player lookup in route handlers
```typescript
// BEFORE (mixed in lib/api/auth.ts)
import { verifyTokenAndGetPlayer } from '@/lib/api/auth'
const player = await verifyTokenAndGetPlayer(request)

// AFTER (boom-miner pattern, split into two steps)
import { getWallet } from '@/lib/api/get-player'
import { findPlayerByUsername } from '@/lib/modules/players/repository.server'
const username = await getWallet(request)  // verifies JWT, returns username
const player = await findPlayerByUsername(username)
```

---

## 7. What Does NOT Change

The following are already aligned with boom-miner and require no structural changes:

- `app/api/transactions/` route structure (deposit, withdraw, purchase, list)
- `lib/modules/transactions-pending/` (already uses `.server.ts` suffix)
- `lib/modules/transactions-processed/` (already uses `.server.ts` suffix)
- `lib/client/solana/deposit.ts` (client tx builder — correct location)
- `lib/auth/wallet-adapters/hive.ts` (already in the right place)
- `lib/config/` (config, database, discord, tokens)
- `lib/registries/` (card, item registries — game-specific, no boom-miner equivalent)
- `features/actions/` HTTP callers (these call the API — correct layer)
- `features/images/` (game-specific asset maps)
- `server/solana-smart-contract/workers/` (already refactored, socket removed)
- `server/workers/index.ts` (already cleaned up)
- `app/game/*/page.tsx` (pages — no structural change needed)
- `components/ui/` (shadcn primitives)
- `public/` (static assets)
- `context/AuthContext.tsx` (correct — auth only)
- `context/AudioContext.tsx` (correct — audio only)
- `hooks/useAuthCheck.ts`, `useBlockchain.ts`, `useHiveKeychain.ts`, `useTimer.ts`

---

## 8. Dependency Risk Notes

- **`socket.io` and `socket.io-client`** — still in `package.json`. Safe to remove
  once `server/sockets/` is deleted and no file imports from either package. Run a
  project-wide grep for `socket.io` before removing.

- **Import path churn** — renaming `player.model.ts` → `model.server.ts` breaks every
  file that imports `from '@/lib/modules/players/player.model'`. Do all renames in a
  single commit to prevent a broken intermediate state. The full list of affected import
  sites should be audited with grep before execution.

- **`public/data/index`** — `player.service.ts` and `mission.service.ts` both import
  `GAME_DATA from '@/public/data'`. This import continues to work after the rename/merge
  since `repository.server.ts` will keep the same import. No change needed.

- **`player.builder.ts`** exports `getRawCardBoostsById` and `applyBoostCap` which are
  called from `mission.service.ts`. After the merge both live in `repository.server.ts`
  and can be called internally. No external call site changes needed.

- **Mongoose models** — each `model.server.ts` must use `mongoose.models.X ||
  mongoose.model('X', schema)` to prevent "Cannot overwrite model" errors in Next.js
  hot-reload. Verify this pattern is present in all models during the rename.
