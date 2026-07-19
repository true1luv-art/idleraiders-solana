"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useEIP6963Wallets,
  WrongChainError,
  ROBINHOOD_CHAIN_ID_DEC,
  ROBINHOOD_RPC_URL,
  ROBINHOOD_CHAIN_NAME,
  ROBINHOOD_EXPLORER_URL,
  type EIP6963Provider,
  type WalletType,
} from "@/lib/auth/use-wallet-adapter";
import { Panel, OuterPanel, InnerPanel } from "@/components/ui/Panel";
import { Tab } from "@/components/ui/Tab";
import { Button } from "@/components/ui/Button";

async function safeJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) throw new Error(`Server error (${res.status}). Please try again.`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Unexpected server response (${res.status}). Please try again.`);
  }
}

type Step =
  | "idle"
  | "picking"
  | "signing"
  | "wrong-chain"
  | "username"
  | "submitting"
  | "success";

export default function LoginPage() {
  const router = useRouter();
  const { wallets, connectAndSign } = useEIP6963Wallets();

  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [wallet, setWallet] = useState("");
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [walletName, setWalletName] = useState("");

  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "taken" | "available" | "invalid"
  >("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [signature, setSignature] = useState("");
  const [message, setMessage] = useState("");
  const [wrongChainWalletName, setWrongChainWalletName] = useState("");

  function reset() {
    setStep("idle");
    setErrorMsg("");
    setWallet("");
    setWalletType(null);
    setWalletName("");
    setUsername("");
    setUsernameStatus("idle");
    setSignature("");
    setMessage("");
    setWrongChainWalletName("");
  }

  async function handleSelectWallet(selected: EIP6963Provider) {
    setErrorMsg("");
    setStep("signing");
    setWalletName(selected.info.name);

    let result: Awaited<ReturnType<typeof connectAndSign>>;
    try {
      result = await connectAndSign(selected);
    } catch (err) {
      if (err instanceof WrongChainError) {
        setWrongChainWalletName(selected.info.name);
        setStep("wrong-chain");
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : "Wallet connection failed.");
      setStep("picking");
      return;
    }

    setWallet(result.wallet);
    setWalletType(result.walletType);
    setSignature(result.signature);
    setMessage(result.message);

    setStep("submitting");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: result.wallet,
          walletType: result.walletType,
          signature: result.signature,
          message: result.message,
        }),
      });
      const data = await safeJson<{
        status: string;
        token?: string;
        error?: string;
      }>(res);

      if (data.status === "not-registered") {
        setStep("username");
        return;
      }
      if (data.status === "ok" && data.token) {
        document.cookie = `rhf_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        setStep("success");
        router.push("/game");
        return;
      }
      if (data.status === "error") {
        setErrorMsg(data.error ?? "Authentication failed. Please try again.");
        setStep("picking");
        return;
      }
      setErrorMsg("Authentication failed. Please try again.");
      setStep("picking");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to check registration.");
      setStep("picking");
    }
  }

  // Username debounce check
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    if (username.length > 24 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameStatus("invalid");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setUsernameStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/check-username?username=${encodeURIComponent(username)}`,
        );
        const data = await safeJson<{ available: boolean; error?: string }>(res);
        if (data.error) { setUsernameStatus("invalid"); return; }
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);
  }, [username]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (usernameStatus !== "available") return;

    setStep("signing");
    setErrorMsg("");

    setStep("submitting");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, walletType, username, signature, message }),
      });
      const data = await safeJson<{ status: string; token?: string }>(res);

      if ((data.status === "ok" || data.status === "already-registered") && data.token) {
        document.cookie = `rhf_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        setStep("success");
        router.push("/game");
        return;
      }
      if (data.status === "username-taken") {
        setUsernameStatus("taken");
        setStep("username");
        return;
      }
      if (data.status === "username-invalid" || data.status === "username-required") {
        setUsernameStatus("invalid");
        setErrorMsg("Username must be 3-24 characters. Letters, numbers and underscores only.");
        setStep("username");
        return;
      }
      setErrorMsg("Registration failed. Please try again.");
      setStep("username");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStep("username");
    }
  }

  const isLoading = ["signing", "submitting", "success"].includes(step);
  const stepLabel =
    step === "username" ? "New Player" : "Sign In";
  const headingLabel =
    step === "username" ? "Choose Your Name" : step === "wrong-chain" ? "Wrong Network" : "Enter Robinhood Farm";



  return (
    <div
      className="relative min-h-screen w-full overflow-hidden font-body bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/bg-login.png')" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-black/40" />

      <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16 sm:px-6">

        {/* Page header */}
        <div className="mb-8 flex justify-center drop-shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/robinhood-farm-logo.png"
            alt="Robinhood Farm"
            className="w-64 sm:w-72"
          />
        </div>

        {/* Main sign-in panel */}
        <div className="w-full max-w-lg">
          <OuterPanel className="pt-5 relative">
            {/* Tab header row */}
            <div className="flex items-center justify-between pl-3 pr-2">
              <div className="flex items-center">
                <Tab isActive onClick={() => {}}>
                  <span className="font-pixel text-[10px] uppercase tracking-widest text-white px-1">
                    {stepLabel}
                  </span>
                </Tab>
              </div>
              <Link
                href="/"
                className="group flex items-center gap-1.5 font-pixel text-[10px] uppercase tracking-widest text-white/70 hover:text-white transition-colors pb-1"
              >
                <svg
                  className="h-3 w-3 transition-transform group-hover:-translate-x-0.5"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </Link>
            </div>

            <InnerPanel className="p-6">
              <div className="space-y-6">

                {/* Heading */}
                <div className="text-center space-y-1">
                  <h2 className="font-pixel text-sm uppercase text-white">
                    {headingLabel}
                  </h2>
                  {wallet && (
                    <p className="text-sm text-white/70">
                      {walletName && (
                        <span className="font-semibold text-white">{walletName}</span>
                      )}{" "}
                      <span className="font-mono text-white/80">
                        {wallet.slice(0, 6)}&hellip;{wallet.slice(-4)}
                      </span>{" "}
                      verified.
                    </p>
                  )}
                </div>

                {/* Step: idle — prompt to connect */}
                {step === "idle" && (
                  <div className="space-y-4">
                    <Button onClick={() => setStep("picking")} disabled={isLoading}>
                      <span className="font-pixel text-[9px] uppercase tracking-widest py-1">
                        Connect Wallet
                      </span>
                    </Button>
                    <p className="text-center text-sm leading-relaxed text-white/70">
                      Signing is <span className="text-white font-semibold">free</span> — it never moves funds.
                    </p>
                  </div>
                )}

                {/* Step: picking — EIP-6963 wallet list */}
                {step === "picking" && (
                  <div className="space-y-3">
                    {wallets.length === 0 ? (
                      <div className="text-center space-y-3 py-2">
                        <p className="text-sm text-white/70 leading-relaxed">
                          No wallets detected. Install MetaMask, Rabby, or another wallet that supports Robinhood Chain and refresh.
                        </p>
                        <Button onClick={reset} disabled={false}>
                          <span className="font-pixel text-[9px] uppercase tracking-widest py-1">Cancel</span>
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-center font-pixel text-[10px] uppercase tracking-widest text-white/60">
                          Choose Wallet
                        </p>
                        <ul className="space-y-2">
                          {wallets.map((w) => (
                            <li key={w.info.uuid}>
                              <button
                                type="button"
                                onClick={() => handleSelectWallet(w)}
                                className="flex w-full items-center gap-3 border-2 border-brown-300/30 bg-brown-600/60 px-4 py-3 text-left transition-all hover:border-white/40 hover:bg-brown-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                              >
                                {/* Wallet icon */}
                                {w.info.icon ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={w.info.icon}
                                    alt=""
                                    className="h-7 w-7 shrink-0 rounded-sm"
                                  />
                                ) : (
                                  <span className="h-7 w-7 shrink-0 rounded-sm bg-white/10" />
                                )}
                                <span className="font-pixel text-[10px] uppercase tracking-widest text-white">
                                  {w.info.name}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                        <Button onClick={reset}>
                          <span className="font-pixel text-[9px] uppercase tracking-widest py-1">Cancel</span>
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* Step: username (new player) */}
                {step === "username" && (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label
                        htmlFor="username"
                        className="mb-2 block font-pixel text-[10px] uppercase tracking-widest text-white/80"
                      >
                        Choose a username
                      </label>
                      <div className="relative">
                        <input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                          maxLength={24}
                          placeholder="farmer_name"
                          autoFocus
                          className="w-full bg-brown-600/80 border-2 border-brown-300/40 px-3 py-2 pr-12 font-body text-base text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none"
                        />
                        {usernameStatus === "checking" && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-pixel text-[8px] text-white/50">...</span>
                        )}
                        {usernameStatus === "available" && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-pixel text-[8px] text-white">OK</span>
                        )}
                        {usernameStatus === "taken" && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-pixel text-[8px] text-rose-400">TAKEN</span>
                        )}
                        {usernameStatus === "invalid" && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-pixel text-[8px] text-rose-400">!</span>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-white/50">
                        3-24 characters. Letters, numbers and underscores only.
                      </p>
                    </div>
                    <Button type="submit" disabled={usernameStatus !== "available" || isLoading}>
                      <span className="font-pixel text-[9px] uppercase tracking-widest py-1">
                        {isLoading ? "Signing..." : "Start Farming"}
                      </span>
                    </Button>
                  </form>
                )}

                {/* Step: signing */}
                {step === "signing" && (
                  <div className="space-y-3 text-center">
                    <p className="text-sm leading-relaxed text-white/70">
                      Check{" "}
                      <span className="text-white font-semibold">{walletName || "your wallet"}</span>{" "}
                      and approve the signature request. This is free — no transaction is sent.
                    </p>
                    <p className="font-pixel text-[9px] uppercase tracking-widest text-white/50 animate-pulse">
                      Waiting for signature...
                    </p>
                  </div>
                )}

                {/* Step: wrong-chain — wallet is not on Robinhood Chain */}
                {step === "wrong-chain" && (
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-white/80">
                      <span className="font-semibold text-white">
                        {wrongChainWalletName || "Your wallet"}
                      </span>{" "}
                      is not connected to{" "}
                      <span className="font-semibold text-amber-300">Robinhood Chain</span>.
                      Add the network manually, then try again.
                    </p>

                    {/* Network details card */}
                    <InnerPanel className="p-4 space-y-2">
                      <p className="font-pixel text-[10px] uppercase tracking-widest text-white/60 mb-3">
                        Network Details
                      </p>
                      {(
                        [
                          ["Network Name", ROBINHOOD_CHAIN_NAME],
                          ["Chain ID",     String(ROBINHOOD_CHAIN_ID_DEC)],
                          ["RPC URL",      ROBINHOOD_RPC_URL],
                          ["Currency",     "ETH"],
                          ["Explorer",     ROBINHOOD_EXPLORER_URL],
                        ] as [string, string][]
                      ).map(([label, value]) => (
                        <div key={label} className="flex flex-col gap-0.5">
                          <span className="font-pixel text-[8px] uppercase tracking-widest text-white/50">
                            {label}
                          </span>
                          <span className="font-mono text-xs text-white/90 break-all">
                            {value}
                          </span>
                        </div>
                      ))}
                    </InnerPanel>

                    <div className="flex gap-2">
                      <Button onClick={reset}>
                        <span className="font-pixel text-[9px] uppercase tracking-widest py-1">
                          Try Again
                        </span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step: submitting / success */}
                {(step === "submitting" || step === "success") && (
                  <div className="text-center">
                    <p className="font-pixel text-[9px] uppercase tracking-widest text-white animate-pulse">
                      {step === "success" ? "Welcome to Robinhood Farm..." : "Authenticating..."}
                    </p>
                  </div>
                )}

                {/* Error */}
                {errorMsg && (
                  <OuterPanel>
                    <InnerPanel className="p-3 text-center">
                      <p className="text-sm leading-relaxed text-rose-300">{errorMsg}</p>
                    </InnerPanel>
                  </OuterPanel>
                )}

              </div>
            </InnerPanel>
          </OuterPanel>
        </div>

      </main>
    </div>
  );
}
