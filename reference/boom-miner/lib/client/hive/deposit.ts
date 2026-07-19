"use client";

/**
 * lib/client/hive/deposit.ts
 *
 * Player → treasury Hive-Engine token deposit, signed IN THE BROWSER via the
 * Hive Keychain extension with the player's ACTIVE key. Mirror of the
 * server-only payout in lib/chain/hive/transfer.ts.
 *
 * A Hive-Engine transfer is a `custom_json` op (id = engineId) carrying a
 * `tokens.transfer` payload. Keychain broadcasts it and returns the Hive
 * consensus tx id. The native `memo` field binds the transfer to the pending
 * deposit `ref`.
 *
 * CLIENT-ONLY.
 */

import type { DepositParams, DepositResult } from "../types";

/** Keychain custom_json capability (superset of the auth adapter's typing). */
interface KeychainCustomJson {
  requestCustomJson: (
    account: string,
    id: string,
    keyType: "Active" | "Posting",
    json: string,
    displayName: string,
    callback: (response: {
      success: boolean;
      error?: string;
      message?: string;
      result?: { id?: string; tx_id?: string };
    }) => void,
    rpc?: string,
  ) => void;
}

function getKeychain(): KeychainCustomJson | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { hive_keychain?: KeychainCustomJson })
    .hive_keychain;
}

export function sendHiveDeposit(
  account: string,
  params: DepositParams,
): Promise<DepositResult> {
  return new Promise((resolve, reject) => {
    const keychain = getKeychain();
    if (!keychain?.requestCustomJson) {
      reject(
        new Error(
          "Hive Keychain extension not found. Install it at hive-keychain.com.",
        ),
      );
      return;
    }

    const json = JSON.stringify({
      contractName: "tokens",
      contractAction: "transfer",
      contractPayload: {
        symbol: params.token.toUpperCase(),
        to: params.treasury.toLowerCase(),
        quantity: params.amount.toFixed(params.decimals),
        memo: params.memo ?? "",
      },
    });

    keychain.requestCustomJson(
      account.trim().toLowerCase(),
      params.engineId ?? "ssc-mainnet-hive",
      "Active",
      json,
      "Boom Miner Deposit",
      (response) => {
        if (!response.success) {
          reject(
            new Error(
              response.error ??
                response.message ??
                "Keychain signing was cancelled or failed.",
            ),
          );
          return;
        }
        const txId = response.result?.id ?? response.result?.tx_id ?? "";
        if (!txId) {
          reject(new Error("Keychain did not return a transaction id."));
          return;
        }
        resolve({ txId });
      },
    );
  });
}
