import { verifyMessage } from "viem";
import { findPlayerByWallet } from "@/lib/modules/players/repository.server";
import { signToken } from "@/lib/auth/jwt";
import { connectDatabase } from "@/lib/config/database";

export interface LoginPlayerInput {
  wallet: string;
  walletType?: string;
  signature?: string;
  message?: string;
}

export type LoginPlayerResult =
  | { status: "ok"; player: object; token: string }
  | { status: "not-registered" }
  | { status: "invalid-wallet" }
  | { status: "invalid-signature" };

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
 * Event: LoginPlayer
 * Authenticates an existing EVM wallet and returns a JWT.
 */
export async function execute(
  input: LoginPlayerInput,
): Promise<LoginPlayerResult> {
  const { wallet, signature, message } = input;

  await connectDatabase();

  // EVM addresses are 42 chars: 0x + 40 hex digits
  if (!wallet || wallet.trim().length < 42) {
    return { status: "invalid-wallet" };
  }

  if (signature && message) {
    const valid = await verifyWalletSignature(wallet, signature, message);
    if (!valid) return { status: "invalid-signature" };
  }

  const normalizedWallet = wallet.toLowerCase();
  const player = await findPlayerByWallet(normalizedWallet);
  if (!player) {
    return { status: "not-registered" };
  }

  const token = await signToken({ wallet: normalizedWallet });
  return { status: "ok", player, token };
}
