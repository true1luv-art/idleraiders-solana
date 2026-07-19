"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  ModalShell,
  ModalTitleBar,
  ActionDock,
  SectionLabel,
} from "@/components/ui/modal";
import {
  useGameStore,
  MINT_COST,
} from "@/features/store/gameStore";
import {
  subscribeToSolanaWallets,
  type DetectedWallet,
} from "@/lib/auth/wallet-adapters/solana";
import { sendSolanaDeposit } from "@/lib/client/solana/deposit";
import type { DepositParams } from "@/lib/client/types";

const PIXEL_HEAD = "'Press Start 2P', 'Silkscreen', monospace";
const PIXEL_BODY = "'VT323', 'Silkscreen', monospace";

type RarityKey = "common" | "uncommon" | "rare" | "epic" | "legendary";

const RARITY_COLOR: Record<RarityKey, string> = {
  common:    "#9ca3af",
  uncommon:  "#22c55e",
  rare:      "#3b82f6",
  epic:      "#a855f7",
  legendary: "#facc15",
};

const RARITY_ODDS: { rarity: RarityKey; pct: number }[] = [
  { rarity: "common",    pct: 50  },
  { rarity: "uncommon",  pct: 28  },
  { rarity: "rare",      pct: 14  },
  { rarity: "epic",      pct: 6   },
  { rarity: "legendary", pct: 2   },
];

/** Public mint payment parameters from GET /api/mint/config. */
interface MintConfig {
  chain:    string;
  treasury: string;
  token:    string;
  decimals: number;
  rpcUrl:   string;
  mintCost: number;
}

// idle → signing (wallet) → queued (payment sent, worker settling) → done | error
type Phase = "idle" | "signing" | "queued" | "done" | "error";

function formatCoins(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return n.toString();
}

interface Props {
  show: boolean;
  onClose: () => void;
}

export function ShopModal({ show, onClose }: Props) {
  const walletAddr     = useGameStore((s) => s.wallet);
  const roster         = useGameStore((s) => s.roster);
  const lastMintTxHash = useGameStore((s) => s.lastMintTxHash);

  const [qty, setQty]             = useState<1 | 5 | 10>(1);
  const [phase, setPhase]         = useState<Phase>("idle");
  // Hero numbers submitted in the current mint; the settled roster is filtered
  // by these to display exactly what was just minted.
  const [mintedNumbers, setMintedNumbers] = useState<number[]>([]);
  const [mintError, setMintError] = useState<string | null>(null);

  // Detected browser wallets + resolved mint payment config.
  const wallets   = useRef<DetectedWallet[]>([]);
  const mintConfig = useRef<MintConfig | null>(null);
  // Baseline settlement marker captured at submit — a change means "our mint
  // settled" (the global poller updates lastMintTxHash + refreshes the roster).
  const baselineMintTx = useRef<string | null>(null);

  const busy      = phase === "signing" || phase === "queued";
  const unitCost  = mintConfig.current?.mintCost ?? MINT_COST;
  const total     = qty * unitCost;

  // Heroes just minted = roster entries whose number we submitted this round.
  const mintedHeroes =
    mintedNumbers.length > 0
      ? roster.filter((h) => mintedNumbers.includes(h.minted_number))
      : [];

  // When our queued mint settles (marker advances past the submit baseline),
  // flip to the done state. The roster itself is refreshed globally over the
  // WS player:state push, so we only need to react to the marker here.
  useEffect(() => {
    if (phase !== "queued") return;
    if (lastMintTxHash && lastMintTxHash !== baselineMintTx.current) {
      setPhase("done");
    }
  }, [phase, lastMintTxHash]);

  const token = () =>
    typeof window !== "undefined" ? localStorage.getItem("bm_token") : null;
  const authHeaders = (): Record<string, string> => {
    const t = token();
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  // Reset a stale terminal state when the shop is reopened so a fresh mint can
  // start. A still-in-flight (queued/signing) mint is left alone.
  useEffect(() => {
    if (!show) return;
    setPhase((p) => (p === "done" || p === "error" ? "idle" : p));
    setMintError(null);
  }, [show]);

  // Discover Wallet-Standard Solana wallets while the modal is open.
  useEffect(() => {
    if (!show) return;
    const unsub = subscribeToSolanaWallets((list) => {
      wallets.current = list;
    });
    return unsub;
  }, [show]);

  // Fetch the (public) mint payment params once the modal opens.
  useEffect(() => {
    if (!show || mintConfig.current) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/mint/config", { headers: { ...authHeaders() } });
        const data = (await res.json()) as { success: boolean } & MintConfig;
        if (!cancelled && res.ok && data.success) {
          mintConfig.current = {
            chain: data.chain,
            treasury: data.treasury,
            token: data.token,
            decimals: data.decimals,
            rpcUrl: data.rpcUrl,
            mintCost: data.mintCost,
          };
        }
      } catch {
        /* fall back to the MINT_COST constant for display; mint will re-check */
      }
    })();
    return () => { cancelled = true; };
  }, [show]);

  /** Pick the detected wallet matching the logged-in account, else the first. */
  const pickWallet = (): DetectedWallet | null => {
    const list = wallets.current;
    if (list.length === 0) return null;
    if (walletAddr) {
      const matched = list.find((w) =>
        w.wallet.accounts.some((a) => a.address === walletAddr),
      );
      if (matched) return matched;
    }
    return list[0];
  };

  const handleMint = async () => {
    if (busy) return;
    setMintedNumbers([]);
    setMintError(null);

    const cfg = mintConfig.current;
    if (!cfg) {
      setMintError("Mint config unavailable — reopen the shop");
      setPhase("error");
      return;
    }

    const detected = pickWallet();
    if (!detected) {
      setMintError("No Solana wallet detected");
      setPhase("error");
      return;
    }

    const base = roster.length;
    const minted_numbers = Array.from({ length: qty }, (_, i) => base + i + 1);

    // 1. Sign + submit the player -> treasury payment in the browser.
    setPhase("signing");
    let txId: string;
    try {
      const params: DepositParams = {
        chain:    "solana",
        treasury: cfg.treasury,
        token:    cfg.token,
        decimals: cfg.decimals,
        amount:   qty * cfg.mintCost,
        rpcUrl:   cfg.rpcUrl,
        memo:     "boom-miner:mint",
      };
      const res = await sendSolanaDeposit(detected.wallet, params);
      txId = res.txId;
    } catch (e) {
      setMintError(
        e instanceof Error && /reject|declin|cancel/i.test(e.message)
          ? "Payment cancelled"
          : "Wallet payment failed",
      );
      setPhase("error");
      return;
    }

    // 2. Enqueue only — the browser never mints. The smart-contract worker
    //    verifies the payment on-chain, claims the txId, and inserts the
    //    heroes. We then wait for the settlement poller to flip us to "done".
    try {
      // Capture the current marker so we can detect OUR settlement landing.
      baselineMintTx.current = useGameStore.getState().lastMintTxHash;
      setMintedNumbers(minted_numbers);

      const res = await fetch("/api/heroes/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ txId, count: qty, minted_numbers }),
      });
      const data = (await res.json()) as {
        success: boolean;
        error?:  string;
        code?:   string;
      };

      if (!res.ok || !data.success) {
        setMintError(data.error ?? "Could not queue mint");
        setPhase("error");
        return;
      }

      // Payment accepted + queued. Minting completes server-side even if this
      // browser closes; the poller + WS push will reconcile the roster.
      setPhase("queued");
    } catch {
      setMintError("Payment sent — minting will finish shortly. Reopen the shop to check.");
      setPhase("error");
    }
  };

  const buttonLabel =
    phase === "signing" ? "CONFIRM IN WALLET..." :
    phase === "queued"  ? "MINTING..." :
    `MINT x${qty}`;

  return (
    <ModalShell
      show={show}
      onClose={onClose}
      tier="panel"
      titleBar={
        <ModalTitleBar
          title="Shop"
          subtitle="Mint heroes"
          onClose={onClose}
        />
      }
      actionDock={
        <ActionDock
          info={
            mintError ? (
              <span className="text-red-400" style={{ fontFamily: PIXEL_HEAD, fontSize: 8 }}>
                {mintError}
              </span>
            ) : phase === "queued" ? (
              <span className="text-amber-300" style={{ fontFamily: PIXEL_HEAD, fontSize: 8 }}>
                Payment sent — minting on-chain...
              </span>
            ) : phase === "done" ? (
              <span className="text-green-400" style={{ fontFamily: PIXEL_HEAD, fontSize: 8 }}>
                Mint complete — added to your roster
              </span>
            ) : (
              <span className="text-white/50" style={{ fontFamily: PIXEL_HEAD, fontSize: 8 }}>
                Pay {formatCoins(total)} $BMCOIN from your wallet
              </span>
            )
          }
        >
          <button
            type="button"
            disabled={busy}
            onClick={handleMint}
            className="wood-frame-light wood-panel-inner px-5 py-2 text-white text-shadow cursor-pointer hover:brightness-110 active:translate-y-0.5 transition-all duration-75 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              fontFamily: PIXEL_HEAD,
              fontSize: 9,
              letterSpacing: 2,
              boxShadow: !busy ? "0 0 0 3px #16a34a" : undefined,
            }}
          >
            {buttonLabel}
          </button>
        </ActionDock>
      }
    >
      <div className="flex flex-col gap-3 p-2">
          {/* Incubator animation */}
          <div className="flex flex-col items-center gap-2">
            <style>{`@keyframes incubatorFrames{from{background-position:0px 0px}to{background-position:-720px 0px}}`}</style>
            <div
              style={{
                width: 180,
                height: 192,
                backgroundImage: "url(/assets/incubator.png)",
                backgroundRepeat: "no-repeat",
                backgroundSize: "720px 192px",
                imageRendering: "pixelated",
                animation: busy ? "incubatorFrames 0.6s steps(4) infinite" : undefined,
              }}
            />
          </div>

          {/* Pack size selector */}
          <div>
            <SectionLabel className="mb-2">Pack Size</SectionLabel>
            <div className="flex gap-2">
              {([1, 5, 10] as const).map((n) => {
                const active = qty === n;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={busy}
                    onClick={() => setQty(n)}
                    className={clsx(
                      "wood-frame-light wood-panel-inner flex-1 py-2.5 text-white text-shadow cursor-pointer hover:brightness-110 active:translate-y-0.5 transition-all duration-75 disabled:opacity-50 disabled:cursor-not-allowed",
                      active ? "brightness-110" : "opacity-70 hover:opacity-100",
                    )}
                    style={{
                      fontFamily: PIXEL_HEAD,
                      fontSize: 11,
                    }}
                  >
                    x{n}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cost row */}
          <div className="flex justify-between items-center bg-black/40 px-3 py-2 rounded">
            <span style={{ fontFamily: PIXEL_HEAD, fontSize: 8, color: "#777", letterSpacing: 1 }}>
              COST
            </span>
            <span
              style={{
                fontFamily: PIXEL_BODY,
                fontSize: 20,
                color: "#fbbf24",
              }}
            >
              {formatCoins(total)} $BMCOIN
            </span>
          </div>

          {/* Rarity odds table */}
          <div>
            <SectionLabel className="mb-2">Rarity Odds</SectionLabel>
            <div className="flex flex-col gap-1">
              {RARITY_ODDS.map(({ rarity, pct }) => (
                <div key={rarity} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: RARITY_COLOR[rarity] }}
                  />
                  <span
                    className="flex-1 text-white/70 capitalize"
                    style={{ fontFamily: PIXEL_BODY, fontSize: 14 }}
                  >
                    {rarity}
                  </span>
                  <span
                    className="text-white"
                    style={{ fontFamily: PIXEL_HEAD, fontSize: 8 }}
                  >
                    {pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Queued — waiting for the worker to settle the mint on-chain. */}
          {phase === "queued" && (
            <div
              className="flex items-center justify-center px-2 py-2 bg-black/30 text-amber-300"
              style={{ border: "1px solid #333", fontFamily: PIXEL_BODY, fontSize: 15 }}
            >
              Minting {qty} hero{qty > 1 ? "es" : ""}... this settles on-chain.
            </div>
          )}

          {/* Mint result */}
          {phase === "done" && mintedHeroes.length > 0 && (
            <div className="flex flex-col gap-1">
              <SectionLabel className="mb-1">Minted {mintedHeroes.length}</SectionLabel>
              {mintedHeroes.map((h) => (
                <div
                  key={h.id}
                  className="flex justify-between items-center px-2 py-1 bg-black/30"
                  style={{ border: "1px solid #333" }}
                >
                  <span className="text-white" style={{ fontFamily: PIXEL_BODY, fontSize: 15 }}>
                    #{h.minted_number} {h.type.toUpperCase()}
                  </span>
                  <span
                    className="px-2 py-0.5 text-black text-[8px]"
                    style={{
                      background: RARITY_COLOR[(h.rarity ?? "common") as RarityKey],
                      fontFamily: PIXEL_HEAD,
                    }}
                  >
                    {h.rarityLabel.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
    </ModalShell>
  );
}
