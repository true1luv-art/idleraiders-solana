# TerraCore — Complete Game Mechanics Documentation

> **Source:** [terracoregame.com/wiki](https://www.terracoregame.com/wiki) + [CryptoGnome/TerraCore-Smart-Contract](https://github.com/CryptoGnome/TerraCore-Smart-Contract)
>
> TerraCore is a post-apocalyptic blockchain strategy game built on the **HIVE blockchain** and **Hive Engine** sidechain. Players mine $SCRAP, raid each other's stashes, explore planets, open NFT crates, and complete quests — all governed by on-chain smart contracts.

---

## Table of Contents

1. [Blockchain Architecture](#1-blockchain-architecture)
2. [Registration & Account Setup](#2-registration--account-setup)
3. [Tokens: $SCRAP & $FLUX](#3-tokens-scrap--flux)
4. [Player Stats](#4-player-stats)
5. [Mining ($SCRAP Generation)](#5-mining-scrap-generation)
6. [Claiming $SCRAP](#6-claiming-scrap)
7. [Stat Upgrade Costs](#7-stat-upgrade-costs)
8. [PvP Battles & Combat](#8-pvp-battles--combat)
9. [Boss Fights & Planetary Exploration](#9-boss-fights--planetary-exploration)
10. [NFTs: Crates, Items & Relics](#10-nfts-crates-items--relics)
11. [Salvaging NFT Items for $FLUX](#11-salvaging-nft-items-for-flux)
12. [Item Forging (Upgrading)](#12-item-forging-upgrading)
13. [Quests](#13-quests)
14. [Leaderboard Rewards](#14-leaderboard-rewards)
15. [Economy: $SCRAP Flow & Sinks](#15-economy-scrap-flow--sinks)
16. [Staking & Stash Size](#16-staking--stash-size)
17. [NFT Marketplace](#17-nft-marketplace)
18. [Consumables](#18-consumables)
19. [Deterministic RNG System](#19-deterministic-rng-system)
20. [Custom JSON Operation Reference](#20-custom-json-operation-reference)

---

## 1. Blockchain Architecture

TerraCore runs across two blockchain layers:

| Layer | Purpose |
|---|---|
| **Hive L1** | Registration, battles, claims, quest collection, NFT marketplace, crate opens |
| **Hive Engine (L2)** | Stat upgrades, boss fights, crate purchases, item forging, quest starts |

The backend is a single unified Node.js process that streams both chains simultaneously and writes to MongoDB. All game state (player stats, stashes, items, quests) is stored in MongoDB; on-chain broadcasts are only used for token issuance and irreversible actions.

**Services:**

| Service | Layer | Handles |
|---|---|---|
| `smart-contract` | Hive L1 | Registration, battles, claims, quest collect |
| `nft` | Hive L1 | Marketplace, crate opens, equip, salvage, consumables |
| `hive-engine` | Hive Engine L2 | Upgrades (engineering/damage/defense), boss fights, crate buys, forges, quest starts |
| `lb-rewards` | Timer (15 min) | Leaderboard SCRAP distribution, revenue splits, DEX price oracle |

---

## 2. Registration & Account Setup

A new player registers by sending HIVE to the `@terracore` account with a JSON memo containing `terracore_register-{hash}`.

```json
{ "hash": "terracore_register-{uniqueHash}", "referrer": "referrer_username" }
```

**Registration fee** is pulled from the `price_feed` collection (`registration_fee` field, in HIVE).

A new player record is created with these **default stats**:

```js
{
  username,
  favor: 0,
  scrap: 1,
  health: 10,
  damage: 10,
  defense: 10,
  engineering: 1,
  cooldown: Date.now(),
  minerate: 0.0001,
  attacks: 3,
  lastregen: Date.now(),
  claims: 3,
  lastclaim: Date.now(),
  registrationTime: Date.now(),
  lastBattle: Date.now(),
  stats: { damage: 10, defense: 10, engineering: 1, dodge: 0, crit: 0, luck: 0 },
  consumables: { protection: 0, protection_times: [], focus: 0 },
  hiveEngineStake: 0,
  items: {}
}
```

**New User Protection:** Newly registered accounts cannot be raided for the first **24 hours** after registration.

**Referral System:** If a valid referrer is specified (not `terracore`, not yourself), the referrer receives a HIVE bonus (`referral_fee` from `price_feed`) paid immediately upon the new player's registration.

---

## 3. Tokens: $SCRAP & $FLUX

### $SCRAP (symbol: `SCRAP`)

| Property | Value |
|---|---|
| Blockchain | Hive Engine |
| Role | Primary in-game currency — mined, spent, staked |
| Minted via | Player claims (on-chain `issue` action) |
| Traded on | Tribaldex (SCRAP/SWAP.HIVE) |

**$SCRAP is minted** when a player calls `claim`. It accumulates passively in your stash based on Engineering. Unclaimed stash can be stolen by raiders.

**$SCRAP is burned (permanently removed)** when:
- Upgrading Engineering, Damage, or Defense (sent to `null`)
- Buying crates (sent to `null`)
- Contributing to Favor (sent to `null`)
- Starting quests (sent to `null`)

**$SCRAP is locked (not burned)** when:
- Staked via Hive Engine (removed from circulation but recoverable)

---

### $FLUX (symbol: `FLUX`)

| Property | Value |
|---|---|
| Blockchain | Hive Engine |
| Role | Boss fight fuel / planetary exploration |
| Produced via | Salvaging NFT items |
| Traded on | Tribaldex (FLUX/SWAP.HIVE) |

$FLUX is a closed-loop currency. Players produce it by destroying NFT items (salvaging), and spend it on every boss fight run. It cannot be mined directly.

---

## 4. Player Stats

Every player has ten core stats:

| Stat | Storage Field | Primary Role |
|---|---|---|
| Engineering | `stats.engineering` | Passive $SCRAP mine rate |
| Damage | `stats.damage` | Offensive PvP power |
| Defense | `stats.defense` | Passive raid resistance |
| Stash Size | `hiveEngineStake` | Max claimable $SCRAP held |
| Attacks | `attacks` | Daily PvP attack charges |
| Luck | `stats.luck` | Crate discovery in boss fights |
| Dodge | `stats.dodge` | Chance to evade incoming attacks |
| Crit | `stats.crit` | Critical hit probability in attacks |
| Staked SCRAP | `hiveEngineStake` | Toughness + passive Luck |
| Favor | `favor` | Planet exploration access |

**Note:** Stash size and toughness are both governed by `hiveEngineStake` — the amount of SCRAP staked on Hive Engine. Staked SCRAP simultaneously acts as stash capacity and a defensive toughness layer.

---

## 5. Mining ($SCRAP Generation)

### Base Mine Rate Formula

Mining uses a **next-upgrade-cost model**: each Engineering level's mine rate is set so that the player can afford the next upgrade within 48 hours of full mining.

```js
// shared/mining.js

const ENG_SOFTCAP      = 333;
const ENG_SOFTCAP_RATE = 0.5;

function computeMineRate(engineeringLevel, lastUpgradeTime) {
    // Softcap: above level 333, each level gives only 50% of normal income gain
    const effective = engineeringLevel > ENG_SOFTCAP
        ? ENG_SOFTCAP + (engineeringLevel - ENG_SOFTCAP) * ENG_SOFTCAP_RATE
        : engineeringLevel;

    const nextUpgradeCost   = Math.pow(effective + 1, 2);
    const timeToNextUpgrade = 48 * 60 * 60; // 48 hours in seconds
    const baseRate          = nextUpgradeCost / timeToNextUpgrade;

    return baseRate * computeDecayMultiplier(lastUpgradeTime);
}
```

**Key properties:**
- Mine rate scales with `(engineeringLevel + 1)²`
- Hard softcap at Engineering level **333** — above this, each level only contributes 50% of normal gain
- A player at Engineering 1 mines very slowly; the returns compound as Engineering is upgraded

### Example Mine Rates

| Engineering Level | SCRAP per Day (approx) |
|---|---|
| 1 | ~2.0 |
| 5 | ~18.0 |
| 10 | ~54.9 |
| 25 | ~330 |
| 50 | ~1,299 |
| 333 | ~(peak undecayed) |

### Mine Rate Decay

To discourage idle accounts, a **decay multiplier** reduces mine rate if no "sink action" has occurred recently. Sink actions that reset the decay timer:
- Starting a quest
- Doing a boss fight
- Upgrading a stat
- Forging (upgrading) an item

**Battles and claims do NOT reset the decay timer.**

```js
function computeDecayMultiplier(lastUpgradeTime) {
    if (lastUpgradeTime == null) return 1.0;
    const daysSince = Math.max(0, (Date.now() - lastUpgradeTime) / 86400000);

    if (daysSince <= 14) return 1.0;          // 14-day grace period: no decay

    const weeks = Math.floor((daysSince - 14) / 7);
    return Math.max(Math.pow(0.90, weeks), 0.25); // -10% per week, floor at 25%
}
```

| Days Since Last Sink | Decay Multiplier |
|---|---|
| 0–14 | 1.0 (100%) |
| 14–21 | 0.90 (90%) |
| 21–28 | 0.81 (81%) |
| 28–35 | 0.73 (73%) |
| ... | ... |
| 84+ days | 0.25 (25% floor) |

### Current Stash Calculation

```js
function computeCurrentScrap(user) {
    const mineRate       = computeMineRate(user.stats?.engineering || 0, user.last_upgrade_time);
    const stashsize      = (user.hiveEngineStake || 0) + 1;
    const secondsElapsed = Math.max((Date.now() - (user.cooldown || Date.now())) / 1000, 0);
    const accumulated    = (user.scrap || 0) + mineRate * secondsElapsed;
    return Math.min(accumulated, stashsize);  // capped at stash size
}
```

The stash is capped at `hiveEngineStake + 1`. Once full, the mine rate continues but no more SCRAP accumulates until you claim.

---

## 6. Claiming $SCRAP

Claiming converts your accumulated in-game stash to real Hive Engine $SCRAP tokens.

### Claim Charges

- Players have a pool of **claim charges** that regenerate over time
- Maximum stack: **5 claims**
- Regeneration rate: **1 claim per 4 hours**
- Cooldown between claims: minimum **30 seconds**

```js
function computeCurrentClaims(user) {
    const stored      = user.claims || 0;
    const hoursSince  = Math.floor((Date.now() - (user.lastclaim || 0)) / 3600000);
    const regenAmount = Math.floor(hoursSince / 4);
    const current     = Math.min(stored + regenAmount, 5); // max 5
    return { current, newLastclaim };
}
```

### Claim Process

1. Player broadcasts `terracore_claim` custom JSON on Hive L1
2. Smart contract computes `computeCurrentScrap(user)` for the exact amount
3. Player's in-game `scrap` is reset to 0, cooldown is updated
4. `SCRAP` tokens are minted and sent to the player's Hive Engine wallet via an on-chain `issue` action

---

## 7. Stat Upgrade Costs

All upgrades are paid by burning $SCRAP to the `null` address on Hive Engine with a memo identifying the upgrade type.

### Engineering Upgrade Cost

```js
// upgrades.js
let cost = Math.pow(user.engineering, 2);
// Engineering increases by +1 per upgrade
```

| Engineering Level (current) | Cost to Upgrade |
|---|---|
| 1 | 1 SCRAP |
| 5 | 25 SCRAP |
| 10 | 100 SCRAP |
| 20 | 400 SCRAP |
| 50 | 2,500 SCRAP |
| 100 | 10,000 SCRAP |

**Formula:** `cost = currentEngineeringLevel²`

### Damage Upgrade Cost

```js
let cost = Math.pow(user.damage / 10, 2);
// Damage increases by +10 per upgrade (stored as multiple of 10)
```

| Damage Level (stored) | Cost to Upgrade |
|---|---|
| 10 | 1 SCRAP |
| 20 | 4 SCRAP |
| 50 | 25 SCRAP |
| 100 | 100 SCRAP |
| 200 | 400 SCRAP |

**Formula:** `cost = (currentDamage / 10)²`

### Defense Upgrade Cost

```js
let cost = Math.pow(user.defense / 10, 2);
// Defense increases by +10 per upgrade (stored as multiple of 10)
```

**Formula:** `cost = (currentDefense / 10)²` — identical to Damage.

### Favor Contribution

Contributing any amount of $SCRAP to the exploration pool increases your Favor by that exact amount. There is no cost formula; it is 1:1 (1 SCRAP burned = 1 Favor gained). Contributed SCRAP cannot be reclaimed.

---

## 8. PvP Battles & Combat

Battles are initiated via a `terracore_battle` custom JSON on Hive L1. The attacker targets another player and attempts to steal their unclaimed $SCRAP stash.

### Attack Charges

```js
function computeCurrentAttacks(user) {
    const stored      = user.attacks || 0;
    const maxAtks     = 8;

    // Attacks max decays if player is inactive (no upgrades/quests)
    const daysSince   = Math.floor((Date.now() - (user.last_upgrade_time || 0)) / (3600000 * 24));
    const weeksDecay  = Math.floor(daysSince / 5);
    const effectiveMax = Math.max(1, maxAtks - weeksDecay);

    const hoursSince  = Math.floor((Date.now() - (user.lastregen || 0)) / 3600000);
    const regenAmount = Math.floor(hoursSince / 4);
    const current     = Math.min(stored + regenAmount, effectiveMax);
    return { current, newLastregen };
}
```

- Base maximum: **8 attacks**
- Regeneration: **1 attack per 4 hours**
- If the player has been inactive (no upgrades/quests) for extended periods, the effective attack cap decays: -1 per 5 days of inactivity, minimum 1
- Log in at least once every **32 hours** to avoid wasting regen

### Combat Prerequisites

For an attack to deal any damage, **all** of the following must be true:
1. Attacker has at least 1 attack charge
2. **Attacker's Damage > Defender's Defense** (`user.stats.damage > target.stats.defense`) — OR the attacker has an active **Focus consumable**
3. Target is not under new-user protection (< 24h since registration)
4. Target does not have an active **Protection consumable**
5. Target was not attacked in the last **60 seconds** (target cooldown)

### Battle Sequence

```
1. Check prerequisites (attacks > 0, damage > defense, protections)
2. Generate deterministic seed: blockId + '@' + trxId + '@' + timestamp
3. Dodge check — target may evade entirely
4. Roll attack percentage
5. Calculate SCRAP stolen (capped by attacker stash size)
6. Atomic bulk-write both players' state
```

### Step 1 — Dodge Check

```js
function checkDodge(_target, seed) {
    const rng  = seedrandom(seed + '-dodge');
    const roll = Math.floor(rng() * 100) + 1; // 1–100
    return roll <= _target.stats.dodge;        // true = attack misses
}
```

- Roll: integer 1–100
- If `roll ≤ target.dodge` → attack is completely negated; attacker loses 1 attack charge but steals nothing
- Focus consumable **bypasses** the dodge check entirely

### Step 2 — Roll Attack Percentage

```js
function rollAttack(_player, seed) {
    const rng  = seedrandom(seed);
    const roll = rng();
    let steal  = roll * (100 - _player.stats.crit + 1) + _player.stats.crit;
    if (steal > 100) steal = 100;
    return steal; // percentage of target's stash to steal
}
```

This roll determines what **percentage** of the target's current stash is stolen. Higher `crit` stat raises the minimum steal percentage:

| Crit Stat | Min Steal % | Max Steal % |
|---|---|---|
| 0 | ~0% | 100% |
| 10 | ~10% | 100% |
| 25 | ~25% | 100% |
| 50 | ~50% | 100% |

**With Crit = 0:** the steal percentage is a uniform roll across 0%–100%.  
**With Crit = 50:** even a minimum roll steals ≥50% of the stash.

### Step 3 — Stash Cap

The attacker cannot accumulate more SCRAP than their stash can hold:

```js
if (scrapToSteal > targetCurrentScrap) scrapToSteal = targetCurrentScrap;
if (userCurrentScrap + scrapToSteal > staked + 1) {
    scrapToSteal = (staked + 1) - userCurrentScrap;
}
```

- Attacker's stash is capped at `hiveEngineStake + 1`
- If the attacker's stash is already full, they steal nothing even if the attack roll is high

### Combat Outcomes Summary

| Condition | Outcome |
|---|---|
| Target has new-user protection | 0 stolen, 1 attack consumed |
| Target has Protection consumable | 0 stolen, 1 attack consumed |
| Target on 60s cooldown | 0 stolen, 1 attack consumed |
| Damage ≤ Defense (no Focus) | Attack blocked, nothing happens |
| Dodge roll succeeds (no Focus) | 0 stolen, 1 attack consumed |
| Attack succeeds | `roll% × target stash` stolen, 1 attack consumed |
| Attacker stash full | 0 stolen, 1 attack consumed |

---

## 9. Boss Fights & Planetary Exploration

Boss fights are triggered by burning $FLUX to `null` on Hive Engine with memo `terracore_boss_fight`.

### Planets

| Planet | FLUX Cost | Cooldown | Rarity Thresholds (out of 1000) |
|---|---|---|---|
| Terracore | 1 FLUX | 4 hours | Uncommon ≤950, Rare ≤985, Epic ≤995, Legendary ≤1000 |
| Oceana | 2 FLUX | 4 hours | Uncommon ≤949, Rare ≤983, Epic ≤993, Legendary ≤1000 |
| Celestia | 2 FLUX | 4 hours | Uncommon ≤948, Rare ≤982, Epic ≤992, Legendary ≤1000 |
| Arborealis | 2 FLUX | 4 hours | Uncommon ≤947.5, Rare ≤981, Epic ≤991, Legendary ≤1000 |
| Neptolith | 2 FLUX | 4 hours | Uncommon ≤947, Rare ≤980.5, Epic ≤990.5, Legendary ≤1000 |
| Solisar | 2 FLUX | 4 hours | Uncommon ≤930, Rare ≤975, Epic ≤993, Legendary ≤1000 |

Higher-tier planets have **lower rarity thresholds**, meaning the chance of finding Rare/Epic/Legendary items is higher.

Planet access requires a minimum **Favor** threshold (stored in `boss_data` per player, gated by `level`). Once unlocked, a planet is permanently accessible.

### Boss Fight Mechanic

```js
async function bossFight(username, _planet, seed) {
    const luck = user.stats.luck;

    // Cooldown check: must be 4+ hours since last fight on this planet
    // (14,400,000 ms = 4 hours)

    const rng  = seedrandom(seed + '-boss');
    const roll = rng() * 100;

    if (roll > luck) {
        // MISS — Award relics instead
        ...
    } else {
        // HIT — Mint crate
        ...
    }
}
```

**The key mechanic:** `roll` is a random float 0–100. If `roll ≤ luck`, a crate drops. If `roll > luck`, relics drop instead.

| Luck | Crate Drop Chance |
|---|---|
| 10 | 10% |
| 25 | 25% |
| 50 | 50% |
| 75 | 75% |
| 100 | 100% |

### On Miss — Relic Rewards

When no crate drops, a secondary roll determines what relics are awarded:

```js
let luck_mod = luck / 5;
if (_planet == 'Terracore') luck_mod = luck_mod / 2;

const roll2 = rng() * 100;
if      (roll2 <= 70) { rarity = 'common';    amount = (rng() * 1.25 * luck_mod) + 1 }
else if (roll2 <= 90) { rarity = 'uncommon';  amount = (rng() *  1   * luck_mod) + 1 }
else if (roll2 <= 98) { rarity = 'rare';      amount = (rng() * 0.75 * luck_mod) + 1 }
else if (roll2 <= 99) { rarity = 'epic';      amount = (rng() * 0.5  * luck_mod) + 1 }
else                  { rarity = 'legendary'; amount = 0.1 * luck_mod }
```

Higher Luck increases the amount of relics, not just the chance of finding crates.

### On Hit — Crate Rarity Roll

```js
async function mintCrate(owner, _planet, droproll, luck, seed) {
    const rng   = seedrandom(seed + '-crate');
    const roll  = Math.floor(rng() * 1001); // 0–1000
    const roll2 = Math.floor(rng() * 1001); // 0–1000 (crate vs. consumable)
    ...
}
```

Two rolls are made:
1. `roll` — compared against the planet's rarity thresholds to determine crate rarity
2. `roll2` — compared against drop thresholds to determine the **type** of drop (crate vs. consumable)

**Drop type thresholds:**

| Planet | Consumable Threshold | Crate Threshold |
|---|---|---|
| Terracore | roll2 ≤ 900 | roll2 > 900 |
| Oceana, Celestia, Neptolith, Solisar | roll2 ≤ 750 | roll2 > 750 |
| Arborealis | roll2 ≤ 500 | roll2 > 500 |

Terracore has a 90% consumable / 10% crate split. Oceana and Celestia have a 75% consumable / 25% crate split. Arborealis has 50/50.

**Rarity determination (Oceana example, roll out of 1000):**

| Roll Range | Rarity |
|---|---|
| 0–949 | Uncommon |
| 950–982 | Rare |
| 983–992 | Epic |
| 993–1000 | Legendary |

---

## 10. NFTs: Crates, Items & Relics

### Rarity Tiers

| Tier | Color | Notes |
|---|---|---|
| Common | Grey | Purchasable with SCRAP; weakest stats |
| Uncommon | Green | First boss-fight reward tier |
| Rare | Blue | Significant stat improvement |
| Epic | Purple | High trade value |
| Legendary | Orange | Best stats; highest market prices |

### Crate Opening — Drop Rates

When a crate is opened, the item rarity is determined by a seeded roll:

| Crate Tier | Common | Uncommon | Rare | Epic | Legendary |
|---|---|---|---|---|---|
| Common | 90% | 9% | 0.75% | 0.2% | 0.05% |
| Uncommon | 10% | 80% | 9% | 1% | 0.1% |
| Rare | 5% | 10% | 80% | 4% | 1% |
| Epic | 1% | 4% | 13% | 80% | 2% |
| Legendary | 0.1% | 1% | 4% | 13% | 82.9% |

### Buying Crates with $SCRAP

Common, Uncommon, Rare, and Epic crates can be purchased directly via Hive Engine by burning SCRAP to `null` with memo `tm_buy_crate`.

The USD-equivalent cost per rarity tier is set in the `price_feed` collection:
- Common: dynamically priced in HIVE (~$5 USD)
- Uncommon: `uncommon_crate_usd` (default ~$10 USD)
- Rare: `rare_crate_usd` (default ~$20 USD)
- Epic: `epic_crate_usd` (default ~$35 USD)

Legendary crates cannot be purchased directly — they only drop from boss fights.

### Item Attributes

NFT items have six attributes that boost player stats when equipped:

| Attribute | Effect When Equipped |
|---|---|
| `damage` | Adds to effective Damage |
| `defense` | Adds to effective Defense |
| `engineering` | Adds to effective Engineering |
| `dodge` | Adds to effective Dodge |
| `crit` | Adds to effective Crit |
| `luck` | Adds to effective Luck |

Legendary items can have attribute values up to **5.0 per attribute**. Luck-bearing items are especially valuable for boss fight crate discovery.

### Item Slots

Players have the following equippable item slots:
- `weapon`
- `armor`
- `ship`
- `special`
- `avatar`

---

## 11. Salvaging NFT Items for $FLUX

Salvaging permanently destroys an NFT item and produces $FLUX.

### $FLUX Yield Formula

```js
// items.js
const value = item.attributes.damage / 2
            + item.attributes.defense / 2
            + item.attributes.engineering * 5
            + item.attributes.dodge * 5
            + item.attributes.crit * 5
            + item.attributes.luck * 10;
```

| Attribute | $FLUX Multiplier |
|---|---|
| Damage | ×0.5 |
| Defense | ×0.5 |
| Engineering | ×5 |
| Dodge | ×5 |
| Crit | ×5 |
| Luck | ×10 |

Luck is by far the most valuable attribute for $FLUX production. A Legendary item with `luck: 5` alone contributes **50 FLUX** from that attribute.

### Example Salvage Yields

| Item Type | Key Attributes | Approximate FLUX |
|---|---|---|
| Common (Damage 10) | dmg 10 | 5 FLUX |
| Uncommon (Luck 2, Engineering 2) | luck 2, eng 2 | 30 FLUX |
| Rare (Luck 3, Dodge 3, Crit 3) | each 3 | 60 FLUX |
| Legendary (all max) | luck 5, others 5 | ~175+ FLUX |

---

## 12. Item Forging (Upgrading)

Items can be upgraded (forged) by burning $FLUX. Each forge level increases all attributes by **5%**.

### Forge Cost

```js
// items.js
const value = item.attributes.damage / 2 + item.attributes.defense / 2
    + item.attributes.engineering * 5 + item.attributes.dodge * 5
    + item.attributes.crit * 5 + item.attributes.luck * 10;

// Minimum FLUX required to forge to next level:
const minCost = value * 0.0498 * item.level;
```

The forge cost scales with the item's **salvage value × current level × 0.0498**.

### Forge Effect

Each successful forge increases all attributes by 5%:

```js
attributes: {
    damage:      item.attributes.damage      * 1.05,
    defense:     item.attributes.defense     * 1.05,
    engineering: item.attributes.engineering * 1.05,
    dodge:       item.attributes.dodge       * 1.05,
    crit:        item.attributes.crit        * 1.05,
    luck:        item.attributes.luck        * 1.05,
},
level: item.level + 1,
```

Forging also **resets the mine rate decay timer** (`last_upgrade_time`), the same as upgrades and quests.

---

## 13. Quests

Quests are time-locked missions that reward Relics upon completion. Players burn $SCRAP to start and broadcast a custom JSON to collect rewards.

### Quest Types

| Quest Type | Primary Stat | Secondary Stat | Required Item Slot |
|---|---|---|---|
| `combat` | Damage | Crit | Weapon |
| `salvage` | Engineering | — | Special |
| `stealth` | Dodge | Luck | Armor |
| `fortune` | Luck | Crit | Avatar |
| `defense` | Defense | — | Ship |

**Note:** Luck and Dodge are "item-only stats" — they cannot be upgraded directly via SCRAP; their thresholds use separate (lower) requirements and are summed across all equipped items.

### Quest Tiers

| Tier | Level Req | Stat Req (normal) | Stat Req (luck/dodge) | Duration | Base Rolls | Base Cost (SCRAP) |
|---|---|---|---|---|---|---|
| 1 | 1 | 10 | 2 | 1 hour | 2 | 20 |
| 2 | 10 | 50 | 5 | 4 hours | 3 | 100 |
| 3 | 25 | 100 | 12 | 12 hours | 4 | 235 |
| 4 | 50 | 200 | 20 | 24 hours | 6 | 985 |
| 5 | 100 | 500 | 40 | 48 hours | 10 | 4,010 |

**Tier 3+ requires an equipped item** in the quest's required slot.

**Costs are dynamically adjusted** by `quest_cost_multiplier` from `price_feed` (set by the 4-hour oracle in lb-rewards). A 1% slippage tolerance is applied.

Only **one quest of the same type+tier** can be active per player per daily board.

### Quest Collection (Reward Calculation)

After the duration expires, the player broadcasts `terracore_quest_collect`. Rewards are calculated deterministically from the block seed:

```
1. Base roll: rollDice(100, seed) → 0–100
2. Effective roll: adjusted by primary stat vs. stat requirement, plus secondary stat bonus
3. Draw count: determined by effective roll brackets (more draws = more loot)
4. Item bonuses: rare/epic/legendary equipped item grants +1 guaranteed draw;
   each forge level above 1 adds 5% chance of one more draw
5. Affinity bonus: item's primary attribute value adds fractional extra draws
6. Investment factor: ungeared accounts receive reduced rewards (anti-farm)
7. Per-draw: weighted rarity table draw + jackpot roll
8. Issue relics for each rarity × amount earned
```

#### Effective Roll Formula

The effective roll incorporates stat skill:
- Higher primary stat relative to the tier's stat requirement → higher effective roll
- Secondary stat provides a smaller additional bonus
- Maximum effective roll is capped at ~183 (allowing guaranteed legendary draws at 100+)

#### Draw Count from Effective Roll

| Effective Roll | Draw Count |
|---|---|
| 0–30 | Base rolls |
| 31–60 | Base rolls + 1 |
| 61–90 | Base rolls + 2 |
| 91–99 | Base rolls + 3 |
| 100+ | Base rolls + 4 + guaranteed legendary draw |

**Jackpot:** Each individual draw has a small jackpot chance — if triggered, the rarity is bumped up one tier and the amount is tripled.

### Quest Board

Quests are drawn daily from a template pool (`quest-templates` collection). The daily board contains slots covering all 5 types × multiple tiers. The weighted tier distribution is:

```
Tier 1: 10%, Tier 2: 20%, Tier 3: 30%, Tier 4: 25%, Tier 5: 15%
```

---

## 14. Leaderboard Rewards

Every **15 minutes** the `lb-rewards` service cycle runs. Once per day (controlled by `rewardtime` in global stats), it distributes SCRAP to the top leaderboard players.

### Reward Pool

```js
const pool = scrapBalance * 0.0001; // 0.01% of terracore's SCRAP balance
```

The reward pool is **0.01% of the `@terracore` account's Hive Engine $SCRAP balance**.

### Distribution

The leaderboard API (`api.terracoregame.com/leaderboard`) returns each player's `reward` score. Each player's share is proportional:

```js
user.calculatedReward = (user.reward / totalApiRewards) * pool;
```

Rewards are sent as on-chain Hive Engine SCRAP transfers.

---

## 15. Economy: $SCRAP Flow & Sinks

```
Mine SCRAP (Engineering)
    ↓
Claim SCRAP (stash → wallet) [mints new SCRAP]
    ↓
Spend on:
  ├─ Engineering upgrades    [burned to null]
  ├─ Damage upgrades         [burned to null]
  ├─ Defense upgrades        [burned to null]
  ├─ Crate purchases         [burned to null]
  ├─ Favor contributions     [burned to null]
  ├─ Quest starts            [burned to null]
  └─ Staking                 [locked, not burned]

Staked SCRAP → Luck + Dodge bonuses + Tash Size
Favor → Unlock higher-tier planets
```

### SCRAP Sinks (Deflationary Pressure)

| Sink | Mechanism |
|---|---|
| Engineering upgrade | `cost = engineeringLevel²` SCRAP burned |
| Damage upgrade | `cost = (damage/10)²` SCRAP burned |
| Defense upgrade | `cost = (defense/10)²` SCRAP burned |
| Crate purchase | Dynamic USD-pegged cost burned |
| Favor contribution | 1:1 SCRAP burned = Favor gained |
| Quest start | Tier-based SCRAP burned (T1=20 … T5=4,010) |

---

## 16. Staking & Stash Size

$SCRAP is staked directly on Hive Engine (Tribaldex). Staked amounts are read by the smart contract as `hiveEngineStake`.

### Stash Size

```
stashSize = hiveEngineStake + 1
```

The `+1` ensures new players with no stake can still accumulate a small amount. Your stash cap equals your staked SCRAP plus 1.

### Toughness (Combat)

Staked SCRAP acts as an upper bound on how much the attacker can steal in one battle:

```js
if (userCurrentScrap + scrapToSteal > staked + 1) {
    scrapToSteal = (staked + 1) - userCurrentScrap;
}
```

An attacker with a full stash (already at `stake + 1`) cannot steal anything regardless of roll result.

### Luck from Staked SCRAP

Staking provides Luck bonuses through a stepped halving formula:

```
luck += 0.025 per SCRAP staked
```

With halving at each threshold: **1, 3, 5, 8, 10, 15, 20...** up to 90.

- Early staking provides 0.025 Luck per SCRAP
- At each threshold, the rate halves
- Very high stakes yield diminishing Luck returns

---

## 17. NFT Marketplace

Players trade crates, items, relics, and consumables on the in-game marketplace (Hive L1 custom JSON operations).

### Fee Structure

| Fee | Amount | Recipient |
|---|---|---|
| Game fee | 2.5% | @terracore |
| Marketplace fee | 2.5% | Marketplace operator |
| **Total** | **5%** | — |

Fees are deducted from the purchase price automatically by the smart contract at time of sale.

**Minimum listing price:** 0.05 HIVE.

### Marketplace API

```
GET https://api.terracoregame.com/marketplace/listings/{type}
```
Where `{type}` is: `items`, `crates`, `relics`, or `consumables`.

```
GET https://api.terracoregame.com/marketplace_logs?action=purchase&limit=200
```
Recent purchase logs for price discovery.

---

## 18. Consumables

Consumables are single-use NFTs that temporarily modify combat behavior.

### Consumable Types by Rarity Drop

| Boss Fight Miss Rarity | Available Consumable Types |
|---|---|
| Uncommon | `attack`, `claim`, `crit`, `damage`, `dodge` |
| Rare | `rage`, `impenetrable`, `overload`, `rogue`, `battle`, `fury` |
| Epic/Legendary | `protection`, `focus` |

### Key Consumable Effects

| Consumable | Effect |
|---|---|
| `protection` | Blocks all incoming attacks for 24 hours |
| `focus` | Bypasses dodge check AND allows attacking targets where damage ≤ defense |

**Protection consumable check in combat:**

```js
if (target.consumables.protection > 0 &&
    Date.now() - target.consumables.protection_times[0] < 86400000) {
    // Attack blocked, attacker loses 1 charge
}
```

**Focus consumable check in combat:**

```js
if (user.stats.damage > target.stats.defense || user.consumables.focus > 0) {
    // Attack proceeds
    if (checkDodge(target, seed) && user.consumables.focus == 0) {
        // Dodge only applies if focus is NOT active
    }
    if (user.consumables.focus > 0) {
        // Decrement focus count
        'consumables.focus': -1
    }
}
```

---

## 19. Deterministic RNG System

All combat, boss fight, and quest outcomes use **seeded deterministic RNG** via the `seedrandom` library. This ensures outcomes are reproducible and verifiable against on-chain data.

### Seed Construction

```js
// shared/rng.js
function createSeed(blockId, trxId, hash) {
    return blockId + '@' + trxId + '@' + hash;
}
```

The seed is derived from:
- **blockId** — the Hive block ID containing the transaction
- **trxId** — the transaction ID within that block
- **hash** — a context-specific suffix (e.g., `username`, `'boss'`, `'crate'`, `'-dodge'`)

### Core RNG Functions

```js
// Lower bound: 1% of index (not truly zero)
function rollDice(index, seed) {
    const rng = seedrandom(seed);
    return rng() * (index - 0.01 * index) + 0.01 * index;
}

// With optional adjustment (clamped to [1%, 99%] of index)
function adjustedRoll(index, adjustment, seed) { ... }

// Integer in [0, 99999] — used for NFT item generation
function generateRandomNumber(seed) { ... }
```

**Important:** `Math.random()` is never used for game-state-changing operations. All seeded paths use `seedrandom`.

---

## 20. Custom JSON Operation Reference

### Hive L1 Operations

| Operation ID | Trigger | Memo / JSON |
|---|---|---|
| `transfer` to `@terracore` | Register player | `{ "hash": "terracore_register-{hash}", "referrer": "..." }` |
| `terracore_claim` | Claim accumulated $SCRAP | (no payload needed) |
| `terracore_battle` | PvP attack | `{ "target": "username" }` |
| `terracore_quest_collect` | Collect completed quest | `{ "quest_id": "<ObjectId>" }` |

### Hive Engine L2 SCRAP Burns (to `null`)

| Memo Prefix | Action |
|---|---|
| `terracore_engineering` | Upgrade Engineering |
| `terracore_damage` | Upgrade Damage |
| `terracore_defense` | Upgrade Defense |
| `terracore_contribute` | Contribute SCRAP for Favor |
| `tm_buy_crate` | Purchase a crate |
| `terracore_quest_start-{type}-{tier}` | Start a quest |

### Hive Engine L2 FLUX Burns (to `null`)

| Memo hash | Action |
|---|---|
| `terracore_boss_fight` | Trigger boss fight on a planet |
| (item upgrade memo) | Forge / upgrade an NFT item |

### NFT L1 Operations

Marketplace listing, buying, equipping, salvaging, and consumable use are all triggered via Hive L1 `custom_json` operations (handled by the `nft` service).

---

## API Reference

Base URL: `https://api.terracoregame.com`

| Endpoint | Description |
|---|---|
| `GET /player/{username}` | Full player stats |
| `GET /leaderboard` | Leaderboard scores |
| `GET /crate_price` | Current common crate price |
| `GET /marketplace/listings/{type}` | Active marketplace listings |
| `GET /marketplace_logs?action=purchase&limit=N` | Recent sales |

---

*Documentation compiled from [terracoregame.com/wiki](https://www.terracoregame.com/wiki) and the [TerraCore-Smart-Contract](https://github.com/CryptoGnome/TerraCore-Smart-Contract) repository. Cross-referenced against live smart contract source code for formula accuracy.*
