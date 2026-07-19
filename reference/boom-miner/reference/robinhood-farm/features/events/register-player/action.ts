import { verifyMessage } from "viem";
import { createPlayer, findPlayerByWallet } from "@/lib/modules/players/repository.server";
import { PlayerModel } from "@/lib/modules/players/model.server";
import { connectDatabase } from "@/lib/config/database";
import { signToken } from "@/lib/auth/jwt";

export interface RegisterPlayerInput {
  wallet: string;
  walletType?: string;
  username?: string;
  signature?: string;
  message?: string;
  referrer?: string;
}

export type RegisterPlayerResult =
  | { status: "ok"; player: object; token: string }
  | { status: "already-registered"; player: object; token: string }
  | { status: "invalid-wallet" }
  | { status: "invalid-signature" }
  | { status: "username-required" }
  | { status: "username-taken" }
  | { status: "username-invalid" };

/**
 * Verifies an EVM personal_sign signature using viem.
 * Returns true if the recovered address matches the claimed wallet.
 */
async function verifyWalletSignature(
  wallet: string,
  signature: string,
  message: string,
): Promise<boolean> {
  try {
    return await verifyMessage({
      address: wallet as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

/**
 * Event: RegisterPlayer
 * Registers a new wallet or returns the existing player + JWT.
 */
export async function execute(
  input: RegisterPlayerInput,
): Promise<RegisterPlayerResult> {
  const { wallet, walletType, username, signature, message, referrer } = input;

  await connectDatabase();

  // 1. Basic wallet validation — EVM addresses are 42 chars (0x + 40 hex)
  if (!wallet || wallet.trim().length < 42) {
    return { status: "invalid-wallet" };
  }

  // 2. Signature verification
  if (signature && message) {
    const valid = await verifyWalletSignature(wallet, signature, message);
    if (!valid) return { status: "invalid-signature" };
  }

  const normalizedWallet = wallet.toLowerCase();

  // 3. Check if wallet already registered
  const existing = await findPlayerByWallet(normalizedWallet);
  if (existing) {
    const token = await signToken({ wallet: normalizedWallet });
    return { status: "already-registered", player: existing, token };
  }

  // 4. Validate username if provided — 3-24 chars, alphanumeric + underscores only
  const trimmed = username?.trim() ?? "";
  if (trimmed) {
    if (trimmed.length < 3) {
      return { status: "username-required" };
    }
    if (trimmed.length > 24) {
      return { status: "username-invalid" };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return { status: "username-invalid" };
    }

    // 5. Check username uniqueness (case-insensitive)
    const taken = await PlayerModel.findOne({
      username: { $regex: new RegExp(`^${trimmed}$`, "i") },
    }).lean();
    if (taken) {
      return { status: "username-taken" };
    }
  }

  // 6. Create new player document with default state
  const player = await createPlayer({ wallet: normalizedWallet, username: trimmed || undefined, referrer });
  const token = await signToken({ wallet: normalizedWallet });

  return { status: "ok", player, token };
}
