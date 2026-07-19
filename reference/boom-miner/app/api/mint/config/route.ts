import { apiOk, apiError } from "@/lib/api/error-response";
import { getWallet } from "@/lib/api/get-wallet";
import { config } from "@/lib/config/config";
import { getMintDecimals } from "@/lib/chain/solana/rpc";
import { MINT_COST } from "@/lib/constants/game";

/**
 * GET /api/mint/config
 *
 * Returns the public, non-sensitive parameters the browser needs to build a
 * player -> treasury mint payment (see lib/client/solana/deposit.ts). None of
 * this is secret — it is treasury address, mint, decimals and the public RPC
 * url — but it lives server-side in config, so we surface it through an
 * authenticated endpoint rather than baking NEXT_PUBLIC_* vars into the bundle.
 */
export async function GET(req: Request): Promise<Response> {
  const wallet = await getWallet(req);
  if (!wallet) {
    return apiError("Not authenticated", "UNAUTHORIZED", 401);
  }

  const chain = config.blockchain.chain;
  if (chain !== "solana") {
    return apiError(`Client-transfer minting is not configured for chain "${chain}"`, "UNSUPPORTED_CHAIN", 400);
  }

  const solana = config.blockchain.solana;
  if (!solana.mint) {
    return apiError("Server mint address is not configured", "MINT_NOT_CONFIGURED", 500);
  }

  // Fetch live decimals from the Token-2022 mint so the browser builds the
  // transfer with the correct base-unit amount regardless of the mint's decimals.
  let decimals: number;
  try {
    decimals = await getMintDecimals();
  } catch {
    return apiError("Failed to fetch mint decimals from chain", "CHAIN_ERROR", 502);
  }

  return apiOk({
    chain,
    treasury: config.blockchain.treasuryAddress,
    token:    solana.mint,
    decimals,
    rpcUrl:   solana.rpcUrl,
    /** Whole-token price per hero. Client multiplies by quantity. */
    mintCost: MINT_COST,
  });
}
