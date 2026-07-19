import { PlayerModel }               from "./model.server";
import { FarmModel }                 from "@/lib/modules/farms/model.server";
import type { CreatePlayerInput, UpdatePlayerStateInput } from "@/features/types/players";
import { connectDatabase }           from "@/lib/config/database";
import { sendWithdrawalToPlayer }    from "@/server/farm-smart-contract/lib/transfers";
import { debitTreasury, creditTreasury } from "@/lib/modules/game-stats/repository.server";
import {
  findProcessedTransaction,
  insertProcessedTransaction,
} from "@/lib/modules/transactions-processed/repository.server";

export async function createPlayer(input: CreatePlayerInput) {
  await connectDatabase();
  return PlayerModel.create({
    wallet:           input.wallet,
    username:         input.username,
    referrer:         input.referrer,
    registrationTime: Date.now(),
  });
}

export async function findPlayerByWallet(wallet: string) {
  await connectDatabase();
  return PlayerModel.findOne({ wallet }).lean();
}

export async function updatePlayerState(
  wallet: string,
  updates: UpdatePlayerStateInput,
) {
  await connectDatabase();
  return PlayerModel.findOneAndUpdate(
    { wallet },
    { $set: updates },
    { new: true },
  ).lean();
}

export async function getAllPlayers() {
  await connectDatabase();
  return PlayerModel.find({}).lean();
}

// ---------------------------------------------------------------------------
// Balance mutations — coins-backed §9.3 / §9.4
// ---------------------------------------------------------------------------

/**
 * Credits `amount` to the player's persisted Game Balance.
 */
export async function addBalance(playerId: string, amount: number): Promise<void> {
  await connectDatabase();
  const player = await PlayerModel.findOne({ wallet: playerId }, { coins: 1 }).lean<{ coins: number }>();
  if (!player) return;
  await PlayerModel.updateOne(
    { wallet: playerId },
    { $set: { coins: Math.max(0, (player.coins ?? 0) + amount) } },
  );
}

/**
 * Deducts `amount` from the player's persisted Game Balance, clamped to 0.
 */
export async function deductBalance(playerId: string, amount: number): Promise<void> {
  await addBalance(playerId, -amount);
}

// ---------------------------------------------------------------------------
// Bank — Shrine operations
// ---------------------------------------------------------------------------

/** Returns true if two Unix-ms timestamps fall on the same UTC calendar day. */
function sameUtcDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth()    === db.getUTCMonth()    &&
    da.getUTCDate()     === db.getUTCDate()
  );
}

/** Unix ms timestamp of the next midnight UTC from a given timestamp. */
export function nextMidnightUtc(from: number): number {
  const d = new Date(from);
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

export type BurnResult = {
  coins: number;
  stash: number;
  stashGained: number;
};

export async function burnCoins(wallet: string, amount: number): Promise<BurnResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw Object.assign(new Error("amount must be a positive integer"), { code: "INVALID_AMOUNT" });
  }
  if (amount % 100 !== 0) {
    throw Object.assign(new Error("amount must be divisible by 100"), { code: "NOT_DIVISIBLE" });
  }

  await connectDatabase();

  const player = await PlayerModel.findOne({ wallet });
  if (!player) throw Object.assign(new Error("Player not found"), { code: "NOT_FOUND" });

  if (player.coins < amount) {
    throw Object.assign(new Error("Insufficient coins"), { code: "INSUFFICIENT_COINS" });
  }

  const stashGained = Math.floor(amount * 0.25);

  const updated = await PlayerModel.findOneAndUpdate(
    { wallet, coins: { $gte: amount } },
    { $inc: { coins: -amount, stash: stashGained } },
    { new: true },
  );

  if (!updated) {
    throw Object.assign(new Error("Insufficient coins (race condition)"), { code: "INSUFFICIENT_COINS" });
  }

  try {
    await FarmModel.findOneAndUpdate(
      { playerId: wallet },
      { $inc: { "milestones.Coins Burned": amount } },
      { upsert: false },
    );
  } catch { /* non-fatal */ }

  return { coins: updated.coins, stash: updated.stash, stashGained };
}

export type WithdrawResult = {
  coins: number;
  stash: number;
  withdrawnToday: number;
  nextWithdrawAt: number;
  txHash: string;
};

export async function withdrawCoins(wallet: string, amount: number): Promise<WithdrawResult> {
  if (!Number.isInteger(amount) || amount < 1) {
    throw Object.assign(new Error("amount must be a positive integer ≥ 1"), { code: "INVALID_AMOUNT" });
  }

  await connectDatabase();

  const player = await PlayerModel.findOne({ wallet });
  if (!player) throw Object.assign(new Error("Player not found"), { code: "NOT_FOUND" });

  const now = Date.now();
  const isNewDay = player.lastWithdrawnAt === 0 || !sameUtcDay(player.lastWithdrawnAt, now);
  const currentWithdrawnToday = isNewDay ? 0 : player.withdrawnToday;

  if (!isNewDay && currentWithdrawnToday > 0) {
    throw Object.assign(
      new Error("Already withdrawn today. Next withdrawal available at midnight UTC."),
      { code: "ALREADY_WITHDRAWN_TODAY", nextWithdrawAt: nextMidnightUtc(now) },
    );
  }

  const available = player.stash - currentWithdrawnToday;

  if (player.stash === 0) {
    throw Object.assign(
      new Error("No stash. Burn coins at the Shrine to unlock withdrawals."),
      { code: "NO_STASH" },
    );
  }

  if (amount > available) {
    throw Object.assign(
      new Error(`amount exceeds available withdrawal limit (${available} coins)`),
      { code: "EXCEEDS_LIMIT", available },
    );
  }

  if (player.coins < amount) {
    throw Object.assign(new Error("Insufficient coins"), { code: "INSUFFICIENT_COINS" });
  }

  const { txHash } = await sendWithdrawalToPlayer(wallet, amount);

  const updated = await PlayerModel.findOneAndUpdate(
    { wallet, coins: { $gte: amount } },
    {
      $inc: { coins: -amount },
      $set: {
        withdrawnToday:  isNewDay ? amount : currentWithdrawnToday + amount,
        lastWithdrawnAt: now,
      },
    },
    { new: true },
  );

  if (!updated) {
    console.error(`[bank] withdrawal MongoDB update missed for wallet=${wallet} amount=${amount} txHash=${txHash}`);
  }

  await debitTreasury(amount, "player_withdrawal");

  // Write ledger row for this withdrawal.
  await insertProcessedTransaction({
    txHash,
    wallet,
    type:   "withdrawal",
    amount: -amount,
  }).catch((err) => {
    console.error(`[bank] Non-fatal: failed to write withdrawal ledger row for wallet=${wallet}: ${err instanceof Error ? err.message : String(err)}`);
  });

  try {
    await FarmModel.findOneAndUpdate(
      { playerId: wallet },
      { $inc: { "milestones.Coins Withdrawn": amount } },
      { upsert: false },
    );
  } catch { /* non-fatal */ }

  return {
    coins:          updated?.coins          ?? (player.coins - amount),
    stash:          updated?.stash          ?? player.stash,
    withdrawnToday: updated?.withdrawnToday ?? amount,
    nextWithdrawAt: nextMidnightUtc(now),
    txHash,
  };
}

export type DepositResult     = { coins: number };
export type VerifyDepositResult = { coins: number };

async function _creditCoins(wallet: string, amount: number): Promise<DepositResult> {
  const updated = await PlayerModel.findOneAndUpdate(
    { wallet },
    { $inc: { coins: amount } },
    { new: true },
  );
  if (!updated) throw Object.assign(new Error("Player not found"), { code: "NOT_FOUND" });
  return { coins: updated.coins };
}

export async function verifyAndCreditDeposit(
  wallet: string,
  txHash: string,
  amount: number,
): Promise<VerifyDepositResult> {
  if (!Number.isInteger(amount) || amount < 1) {
    throw Object.assign(new Error("amount must be a positive integer ≥ 1"), { code: "INVALID_AMOUNT" });
  }
  if (!txHash || typeof txHash !== "string") {
    throw Object.assign(new Error("txHash is required"), { code: "INVALID_TX_HASH" });
  }

  await connectDatabase();

  const existing = await findProcessedTransaction(txHash);
  if (existing) {
    throw Object.assign(
      new Error("This transaction has already been credited."),
      { code: "ALREADY_PROCESSED" },
    );
  }

  const { verifyDepositFromPlayer } = await import("@/server/farm-smart-contract/lib/transfers");
  const verification = await verifyDepositFromPlayer(txHash, wallet, amount);

  if (!verification.valid) {
    throw Object.assign(
      new Error(verification.reason ?? "Deposit verification failed"),
      { code: "VERIFICATION_FAILED" },
    );
  }

  await insertProcessedTransaction({ txHash, wallet, type: "deposit", amount });

  const result = await _creditCoins(wallet, amount);

  await creditTreasury(amount, "player_deposit");

  try {
    await FarmModel.findOneAndUpdate(
      { playerId: wallet },
      { $inc: { "milestones.Coins Deposited": amount } },
      { upsert: false },
    );
  } catch { /* non-fatal */ }

  return result;
}
