"use client";

/**
 * lib/client/solana/deposit.ts
 *
 * Player → treasury SPL-token deposit, signed IN THE BROWSER by the player's
 * Wallet-Standard wallet. This is the mirror image of the server-only payout
 * in lib/chain/solana/transfer.ts: there the treasury signs; here the player
 * signs. The server never sees the player's key.
 *
 * Steps:
 *   1. Connect the wallet and resolve the player's public key.
 *   2. Derive the player + treasury associated token accounts (ATAs).
 *   3. Build transferChecked (player ATA → treasury ATA) + a memo instruction.
 *   4. Ask the wallet to sign AND send; return the signature as the tx id.
 *
 * CLIENT-ONLY.
 */

import { Buffer } from "buffer";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAccount,
} from "@solana/spl-token";
import type { Wallet } from "@wallet-standard/base";
import type { DepositParams, DepositResult } from "../types";

/** Canonical SPL Memo program id (same across all clusters). */
const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

/** Converts a whole-token amount to base units using string math (no float loss). */
function toBaseUnits(amount: number, decimals: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid deposit amount: ${amount}`);
  }
  const [whole, frac = ""] = String(amount).split(".");
  const paddedFrac = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole + paddedFrac);
}

interface ConnectFeature {
  connect: () => Promise<{
    accounts: ReadonlyArray<{ address: string; publicKey: Uint8Array }>;
  }>;
}
interface SignAndSendFeature {
  signAndSendTransaction: (
    ...inputs: ReadonlyArray<{
      account: { address: string; publicKey: Uint8Array };
      transaction: Uint8Array;
      chain: string;
    }>
  ) => Promise<ReadonlyArray<{ signature: Uint8Array }>>;
}

export async function sendSolanaDeposit(
  w: Wallet,
  params: DepositParams,
): Promise<DepositResult> {
  const features = w.features as Record<string, unknown>;
  const connect = features["standard:connect"] as ConnectFeature | undefined;
  const signAndSend = features["solana:signAndSendTransaction"] as
    | SignAndSendFeature
    | undefined;
  if (!connect) throw new Error(`${w.name} does not support connect.`);
  if (!signAndSend) {
    throw new Error(`${w.name} cannot sign and send transactions.`);
  }
  if (!params.rpcUrl) throw new Error("Missing Solana RPC url in deposit params.");

  const { accounts } = await connect.connect();
  const account = (accounts[0] ?? w.accounts[0]) as
    | { address: string; publicKey: Uint8Array }
    | undefined;
  if (!account) throw new Error(`${w.name} did not return an account.`);

  const player = new PublicKey(account.address);
  const treasury = new PublicKey(params.treasury);
  const mint = new PublicKey(params.token);
  const connection = new Connection(params.rpcUrl, "confirmed");

  const playerAta = await getAssociatedTokenAddress(mint, player);
  const treasuryAta = await getAssociatedTokenAddress(mint, treasury);

  const instructions: TransactionInstruction[] = [];

  // Create the treasury ATA on demand if it does not yet exist (player pays rent).
  try {
    await getAccount(connection, treasuryAta);
  } catch {
    instructions.push(
      createAssociatedTokenAccountInstruction(player, treasuryAta, treasury, mint),
    );
  }

  instructions.push(
    createTransferCheckedInstruction(
      playerAta,
      mint,
      treasuryAta,
      player,
      toBaseUnits(params.amount, params.decimals),
      params.decimals,
    ),
  );

  if (params.memo) {
    instructions.push(
      new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(params.memo, "utf8"),
      }),
    );
  }

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction();
  tx.feePayer = player;
  tx.recentBlockhash = blockhash;
  tx.add(...instructions);

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  const chain =
    w.chains.find((c) => c.startsWith("solana:")) ?? "solana:mainnet";

  const [result] = await signAndSend.signAndSendTransaction({
    account,
    transaction: new Uint8Array(serialized),
    chain,
  });
  if (!result?.signature) throw new Error(`${w.name} did not return a signature.`);

  const { default: bs58 } = await import("bs58");
  return { txId: bs58.encode(result.signature) };
}
