"use client";

/**
 * ShrineBankModal
 *
 * Three tabs:
 *   Deposit  — player signs an on-chain HFARM transfer to the treasury via
 *              their EIP-6963 wallet, then submits the txHash to
 *              /api/bank/deposit/verify to credit their in-game balance.
 *   Withdraw — takes coins out (once per UTC day, up to stash ceiling);
 *              the server sends HFARM on-chain from the treasury and returns txHash.
 *   Burn     — permanently destroys coins to raise stash (withdrawal limit).
 */

import { useState, useEffect, useCallback } from "react";
import { ModalShell, ModalTitleBar, NavRail } from "@/components/ui/modal";
import { Button }      from "@/components/ui/Button";
import { InnerPanel }  from "@/components/ui/Panel";
import { usePlayer }   from "@/context/PlayerContext";
import { useEIP6963Wallets } from "@/lib/auth/use-wallet-adapter";

const shrineIcon  = "/assets/buildings/summoning_shrine.png";
const coinIcon    = "/assets/icons/coins.png";

// Treasury address exposed to the client for constructing the ERC-20 transfer.
// This is intentionally public — it is the recipient, not the signing key.
const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_HFARM_TREASURY_ADDRESS ?? "";
const TOKEN_ADDRESS    = process.env.NEXT_PUBLIC_HFARM_TOKEN_ADDRESS    ?? "";
const ROBINHOOD_EXPLORER = "https://robinhoodchain.blockscout.com";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCoins(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function timeUntil(ms: number): string {
  const diff = Math.max(0, ms - Date.now());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function nextMidnightUtc(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

/** Encodes an ERC-20 transfer(address,uint256) call data. */
function encodeTransferCalldata(to: string, rawAmount: bigint): string {
  // transfer(address,uint256) selector = 0xa9059cbb
  const selector = "a9059cbb";
  const paddedTo    = to.replace(/^0x/, "").toLowerCase().padStart(64, "0");
  const paddedValue = rawAmount.toString(16).padStart(64, "0");
  return "0x" + selector + paddedTo + paddedValue;
}

/** Converts whole HFARM (integer) to raw units (18 decimals). */
function toRawHfarm(amount: number): bigint {
  return BigInt(amount) * (10n ** 18n);
}

/** Shortens a tx hash for display. */
function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

// ---------------------------------------------------------------------------
// Shared amount input
// ---------------------------------------------------------------------------

interface AmountInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  max?: number;
  hint?: string;
  disabled?: boolean;
}

function AmountInput({ label, value, onChange, step = 1, max, hint, disabled }: AmountInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-[9px] text-white/60 uppercase tracking-wide"
        style={{ fontFamily: "var(--font-press-start)" }}
      >
        {label}
      </label>
      <input
        type="number"
        min={step}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-brown-600 border border-brown-500 text-white text-xs px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-50"
        style={{ fontFamily: "var(--font-press-start)", fontSize: "10px" }}
      />
      {hint && (
        <p className="text-[8px] text-white/40 leading-relaxed">{hint}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status chip
// ---------------------------------------------------------------------------

function StatusChip({ label, value }: { label: string; value: string }) {
  return (
    <InnerPanel className="flex items-center justify-between px-3 py-1.5 gap-2">
      <span
        className="text-[8px] text-white/60 uppercase tracking-wide shrink-0"
        style={{ fontFamily: "var(--font-press-start)" }}
      >
        {label}
      </span>
      <span
        className="text-[9px] text-amber-300 font-bold text-shadow"
        style={{ fontFamily: "var(--font-press-start)" }}
      >
        {value}
      </span>
    </InnerPanel>
  );
}

// ---------------------------------------------------------------------------
// TxHashChip — shows a confirmed txHash with an explorer link
// ---------------------------------------------------------------------------

function TxHashChip({ txHash }: { txHash: string }) {
  return (
    <InnerPanel className="flex items-center justify-between px-3 py-1.5 gap-2">
      <span
        className="text-[8px] text-white/60 uppercase tracking-wide shrink-0"
        style={{ fontFamily: "var(--font-press-start)" }}
      >
        Tx
      </span>
      <a
        href={`${ROBINHOOD_EXPLORER}/tx/${txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[9px] text-amber-300 underline font-bold text-shadow"
        style={{ fontFamily: "var(--font-press-start)" }}
      >
        {shortHash(txHash)}
      </a>
    </InnerPanel>
  );
}

// ---------------------------------------------------------------------------
// Deposit tab — on-chain HFARM → treasury, then verify + credit
// ---------------------------------------------------------------------------

type DepositStep = "idle" | "signing" | "verifying" | "done";

interface DepositTabProps {
  playerWallet: string;
  coins: number;
  onSuccess: (newCoins: number) => void;
}

function DepositTab({ playerWallet, coins, onSuccess }: DepositTabProps) {
  const { wallets } = useEIP6963Wallets();

  const [amount, setAmount]     = useState("");
  const [step, setStep]         = useState<DepositStep>("idle");
  const [error, setError]       = useState<string | null>(null);
  const [txHash, setTxHash]     = useState<string | null>(null);

  const parsedAmount = parseInt(amount, 10);
  const isValid      = Number.isInteger(parsedAmount) && parsedAmount >= 1;
  const busy         = step === "signing" || step === "verifying";

  async function handleDeposit() {
    if (!isValid || busy) return;
    setError(null);
    setTxHash(null);

    // Find the first connected EIP-6963 provider that has accounts exposed.
    // We request accounts from it to confirm it is unlocked.
    let provider: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } | null = null;
    for (const w of wallets) {
      try {
        const accounts = (await w.provider.request({ method: "eth_accounts" })) as string[];
        if (accounts && accounts.length > 0) {
          provider = w.provider;
          break;
        }
      } catch { /* skip */ }
    }

    if (!provider) {
      setError("No connected wallet found. Please connect your wallet first.");
      return;
    }

    if (!TOKEN_ADDRESS || !TREASURY_ADDRESS) {
      setError("Token or treasury address not configured. Contact support.");
      return;
    }

    // Step 1 — player signs the ERC-20 transfer on-chain
    setStep("signing");
    let hash: string;
    try {
      const rawAmount = toRawHfarm(parsedAmount);
      const data      = encodeTransferCalldata(TREASURY_ADDRESS, rawAmount);
      hash = (await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: playerWallet,
          to:   TOKEN_ADDRESS,
          data,
        }],
      })) as string;
    } catch (e) {
      setStep("idle");
      const msg = (e as { message?: string })?.message ?? "Wallet rejected the transaction.";
      setError(msg);
      return;
    }

    setTxHash(hash);

    // Step 2 — submit txHash to server for verification + coin credit
    setStep("verifying");
    try {
      const res = await fetch("/api/bank/deposit/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ txHash: hash, amount: parsedAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Verification failed");
      setStep("done");
      onSuccess(data.coins);
      setAmount("");
    } catch (e) {
      setStep("idle");
      setError((e as Error).message);
    }
  }

  const stepLabel =
    step === "signing"   ? "Waiting for wallet..." :
    step === "verifying" ? "Verifying on-chain..."  :
    step === "done"      ? "Deposited!"              :
    "Deposit";

  return (
    <div className="flex flex-col gap-3 p-3">
      <StatusChip label="Balance" value={`${formatCoins(coins)} coins`} />

      <AmountInput
        label="Amount to deposit (HFARM)"
        value={amount}
        onChange={(v) => { setAmount(v); setError(null); }}
        step={1}
        hint="Your wallet will sign an on-chain HFARM transfer to the treasury."
        disabled={busy}
      />

      {txHash && <TxHashChip txHash={txHash} />}

      {error && (
        <p className="text-[8px] text-red-400 leading-relaxed" style={{ fontFamily: "var(--font-press-start)" }}>
          {error}
        </p>
      )}

      <Button onClick={handleDeposit} disabled={!isValid || busy}>
        <img src={coinIcon} alt="" className="w-4 h-4 mr-2 pixelated" />
        <span className="text-[9px]" style={{ fontFamily: "var(--font-press-start)" }}>
          {stepLabel}
        </span>
      </Button>

      <InnerPanel className="px-3 py-2">
        <p className="text-[8px] text-white/40 leading-relaxed" style={{ fontFamily: "var(--font-press-start)" }}>
          Send $HFARM to the treasury on Robinhood Chain. Your in-game balance updates after the transaction confirms.
        </p>
      </InnerPanel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Withdraw tab
// ---------------------------------------------------------------------------

interface WithdrawTabProps {
  coins: number;
  stash: number;
  withdrawnToday: number;
  lastWithdrawnAt: number;
  onSuccess: (result: { coins: number; withdrawnToday: number; nextWithdrawAt: number; txHash?: string }) => void;
}

function WithdrawTab({ coins, stash, withdrawnToday, lastWithdrawnAt, onSuccess }: WithdrawTabProps) {
  const [amount, setAmount]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const sameDay = lastWithdrawnAt > 0 && (() => {
    const a = new Date(lastWithdrawnAt);
    const b = new Date();
    return a.getUTCFullYear() === b.getUTCFullYear() &&
           a.getUTCMonth()    === b.getUTCMonth()    &&
           a.getUTCDate()     === b.getUTCDate();
  })();

  const alreadyWithdrawn = sameDay && withdrawnToday > 0;
  const available = sameDay ? Math.max(0, stash - withdrawnToday) : stash;
  const parsedAmount = parseInt(amount, 10);
  const isValid = Number.isInteger(parsedAmount) && parsedAmount >= 1 && parsedAmount <= available;

  useEffect(() => {
    if (!alreadyWithdrawn) return;
    const id = setInterval(() => setCountdown(timeUntil(nextMidnightUtc())), 1000);
    setCountdown(timeUntil(nextMidnightUtc()));
    return () => clearInterval(id);
  }, [alreadyWithdrawn]);

  async function handleWithdraw() {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    setLastTxHash(null);
    try {
      const res = await fetch("/api/bank/withdraw", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ amount: parsedAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Withdraw failed");
      if (data.txHash) setLastTxHash(data.txHash);
      onSuccess({
        coins:          data.coins,
        withdrawnToday: data.withdrawnToday,
        nextWithdrawAt: data.nextWithdrawAt,
        txHash:         data.txHash,
      });
      setAmount("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <StatusChip label="Balance"     value={`${formatCoins(coins)} coins`} />
      <StatusChip label="Stash limit" value={`${formatCoins(stash)} coins`} />
      <StatusChip label="Available"   value={stash === 0 ? "Burn coins to unlock" : `${formatCoins(available)} coins`} />

      {lastTxHash && <TxHashChip txHash={lastTxHash} />}

      {alreadyWithdrawn ? (
        <InnerPanel className="flex flex-col items-center gap-2 px-3 py-4">
          <p className="text-[9px] text-amber-300 text-shadow" style={{ fontFamily: "var(--font-press-start)" }}>
            Withdrawal used today
          </p>
          <p className="text-[8px] text-white/50" style={{ fontFamily: "var(--font-press-start)" }}>
            Next available in
          </p>
          <p className="text-[11px] text-white font-bold text-shadow" style={{ fontFamily: "var(--font-press-start)" }}>
            {countdown}
          </p>
        </InnerPanel>
      ) : (
        <>
          {stash === 0 ? (
            <InnerPanel className="px-3 py-3">
              <p className="text-[8px] text-white/50 leading-relaxed text-center" style={{ fontFamily: "var(--font-press-start)" }}>
                You need to burn coins first to unlock your withdrawal limit.
                Use the Burn tab to get started.
              </p>
            </InnerPanel>
          ) : (
            <>
              <AmountInput
                label="Amount to withdraw"
                value={amount}
                onChange={setAmount}
                step={1}
                max={available}
                hint={`Max: ${formatCoins(available)} coins (once per day)`}
                disabled={loading}
              />

              {error && (
                <p className="text-[8px] text-red-400 leading-relaxed" style={{ fontFamily: "var(--font-press-start)" }}>
                  {error}
                </p>
              )}

              <Button onClick={handleWithdraw} disabled={!isValid || loading}>
                <img src={coinIcon} alt="" className="w-4 h-4 mr-2 pixelated" />
                <span className="text-[9px]" style={{ fontFamily: "var(--font-press-start)" }}>
                  {loading ? "Sending HFARM..." : "Withdraw"}
                </span>
              </Button>
            </>
          )}
        </>
      )}

      <InnerPanel className="px-3 py-2">
        <p className="text-[8px] text-white/40 leading-relaxed" style={{ fontFamily: "var(--font-press-start)" }}>
          The treasury sends $HFARM to your wallet on Robinhood Chain. Once per UTC day, up to your stash limit.
        </p>
      </InnerPanel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Burn tab
// ---------------------------------------------------------------------------

interface BurnTabProps {
  coins: number;
  stash: number;
  onSuccess: (result: { coins: number; stash: number; stashGained: number }) => void;
}

function BurnTab({ coins, stash, onSuccess }: BurnTabProps) {
  const [amount, setAmount]         = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const parsedAmount = parseInt(amount, 10);
  const isDivisible  = Number.isInteger(parsedAmount) && parsedAmount > 0 && parsedAmount % 100 === 0;
  const stashGained  = isDivisible ? Math.floor(parsedAmount * 0.25) : 0;
  const newStash     = stash + stashGained;
  const canAfford    = isDivisible && parsedAmount <= coins;

  function handleAmountChange(v: string) {
    setAmount(v);
    setConfirming(false);
    setError(null);
  }

  async function handleBurn() {
    if (!isDivisible || !canAfford) return;
    if (!confirming) { setConfirming(true); return; }

    setLoading(true);
    setError(null);
    setConfirming(false);
    try {
      const res = await fetch("/api/bank/burn", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ amount: parsedAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Burn failed");
      onSuccess({ coins: data.coins, stash: data.stash, stashGained: data.stashGained });
      setAmount("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <StatusChip label="Balance"       value={`${formatCoins(coins)} coins`} />
      <StatusChip label="Current stash" value={`${formatCoins(stash)} coins`} />

      <AmountInput
        label="Amount to burn (multiples of 100)"
        value={amount}
        onChange={handleAmountChange}
        step={100}
        max={coins}
        hint="Only multiples of 100 accepted. Burn is permanent and irreversible."
        disabled={loading}
      />

      {isDivisible && canAfford && (
        <InnerPanel className="flex items-center justify-between px-3 py-2">
          <span className="text-[8px] text-white/60" style={{ fontFamily: "var(--font-press-start)" }}>
            Stash after burn
          </span>
          <span className="text-[9px] text-green-400 font-bold text-shadow" style={{ fontFamily: "var(--font-press-start)" }}>
            {formatCoins(stash)} + {formatCoins(stashGained)} = {formatCoins(newStash)}
          </span>
        </InnerPanel>
      )}

      {isDivisible && !canAfford && (
        <p className="text-[8px] text-red-400" style={{ fontFamily: "var(--font-press-start)" }}>
          Not enough coins.
        </p>
      )}

      {!isDivisible && amount !== "" && (
        <p className="text-[8px] text-red-400" style={{ fontFamily: "var(--font-press-start)" }}>
          Must be a multiple of 100 (e.g. 100, 200, 500).
        </p>
      )}

      {error && (
        <p className="text-[8px] text-red-400 leading-relaxed" style={{ fontFamily: "var(--font-press-start)" }}>
          {error}
        </p>
      )}

      {confirming ? (
        <div className="flex flex-col gap-2">
          <InnerPanel className="px-3 py-2">
            <p className="text-[8px] text-amber-300 leading-relaxed text-center" style={{ fontFamily: "var(--font-press-start)" }}>
              Burning {formatCoins(parsedAmount)} coins is permanent. Confirm?
            </p>
          </InnerPanel>
          <div className="flex gap-2">
            <Button onClick={() => setConfirming(false)} className="bg-brown-600 hover:bg-brown-500">
              <span className="text-[9px]" style={{ fontFamily: "var(--font-press-start)" }}>Cancel</span>
            </Button>
            <Button onClick={handleBurn} disabled={loading}>
              <span className="text-[9px]" style={{ fontFamily: "var(--font-press-start)" }}>
                {loading ? "Burning..." : "Confirm Burn"}
              </span>
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={handleBurn} disabled={!isDivisible || !canAfford || loading}>
          <img src={coinIcon} alt="" className="w-4 h-4 mr-2 pixelated" />
          <span className="text-[9px]" style={{ fontFamily: "var(--font-press-start)" }}>
            {loading ? "Burning..." : "Burn Coins"}
          </span>
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

type BankTab = "deposit" | "withdraw" | "burn";

interface ShrineBankModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShrineBankModal({ open, onClose }: ShrineBankModalProps) {
  const [activeTab, setActiveTab] = useState<BankTab>("deposit");

  const { player, refreshPlayer } = usePlayer();

  const [coins, setCoins]                     = useState(0);
  const [stash, setStash]                     = useState(0);
  const [withdrawnToday, setWithdrawnToday]   = useState(0);
  const [lastWithdrawnAt, setLastWithdrawnAt] = useState(0);

  const syncFromPlayer = useCallback(() => {
    if (!player) return;
    setCoins(player.coins ?? 0);
    setStash((player as unknown as Record<string, number>).stash ?? 0);
    setWithdrawnToday((player as unknown as Record<string, number>).withdrawnToday ?? 0);
    setLastWithdrawnAt((player as unknown as Record<string, number>).lastWithdrawnAt ?? 0);
  }, [player]);

  useEffect(() => {
    if (open) syncFromPlayer();
  }, [open, syncFromPlayer]);

  function handleDepositSuccess(newCoins: number) {
    setCoins(newCoins);
    refreshPlayer();
  }

  function handleWithdrawSuccess(result: { coins: number; withdrawnToday: number; nextWithdrawAt: number }) {
    setCoins(result.coins);
    setWithdrawnToday(result.withdrawnToday);
    setLastWithdrawnAt(Date.now());
    refreshPlayer();
  }

  function handleBurnSuccess(result: { coins: number; stash: number }) {
    setCoins(result.coins);
    setStash(result.stash);
    refreshPlayer();
  }

  const NAV_ITEMS = [
    { id: "deposit",  label: "Deposit",  icon: "/assets/icons/arrow_down.png" },
    { id: "withdraw", label: "Withdraw", icon: "/assets/icons/arrow_up.png"   },
    { id: "burn",     label: "Burn",     icon: "/assets/icons/lightning.png"  },
  ];

  const SUBTITLES: Record<BankTab, string> = {
    deposit:  "Deposit HFARM",
    withdraw: "Withdraw coins",
    burn:     "Burn for stash",
  };

  return (
    <ModalShell
      show={open}
      onClose={onClose}
      tier="panel"
      titleBar={
        <ModalTitleBar
          icon={shrineIcon}
          title="Shrine Bank"
          subtitle={SUBTITLES[activeTab]}
          onClose={onClose}
        />
      }
      navRail={
        <NavRail
          items={NAV_ITEMS}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as BankTab)}
        />
      }
    >
      {activeTab === "deposit" && (
        <DepositTab
          playerWallet={player?.wallet ?? ""}
          coins={coins}
          onSuccess={handleDepositSuccess}
        />
      )}
      {activeTab === "withdraw" && (
        <WithdrawTab
          coins={coins}
          stash={stash}
          withdrawnToday={withdrawnToday}
          lastWithdrawnAt={lastWithdrawnAt}
          onSuccess={handleWithdrawSuccess}
        />
      )}
      {activeTab === "burn" && (
        <BurnTab
          coins={coins}
          stash={stash}
          onSuccess={handleBurnSuccess}
        />
      )}
    </ModalShell>
  );
}
