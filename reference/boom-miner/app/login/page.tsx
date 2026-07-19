import Link from "next/link";
import type { CSSProperties } from "react";
import { LoginSolana }    from "@/components/login/LoginSolana";
import { LoginRobinhood } from "@/components/login/LoginRobinhood";
import { LoginHive }      from "@/components/login/LoginHive";
import { PlayDemoButton } from "@/components/login/PlayDemoButton";

// ---------------------------------------------------------------------------
// Chain is read server-side from the environment so the correct panel is
// rendered on the initial response — no layout shift, no client guess.
// Expose it as NEXT_PUBLIC_CHAIN so client components can read it too.
// ---------------------------------------------------------------------------
const chain = (process.env.NEXT_PUBLIC_CHAIN ?? process.env.CHAIN ?? "solana").toLowerCase();

const pixelFont = "'Press Start 2P', monospace";
const bodyFont  = "'VT323', monospace";
const gold      = "#facc15";
const cream     = "#f5e9c4";
const bg        = "#0a0a0a";
const hairline  = "rgba(245,233,196,0.15)";

// Per-chain copy
const CHAIN_COPY: Record<string, { label: string; tagline: string; bullets: string[] }> = {
  solana: {
    label:   "SOLANA",
    tagline: "Connect your Solana wallet to claim your pixel miners, stack $BMCOIN, and climb the global leaderboards.",
    bullets: [
      "Works with Phantom, Solflare, Backpack and more",
      "Gasless — you only sign a message, nothing is broadcast",
      "Server-authoritative $BMCOIN balance",
    ],
  },
  robinhood: {
    label:   "ROBINHOOD CHAIN",
    tagline: "Connect your Robinhood Chain wallet to enter the mines and earn $BMCOIN.",
    bullets: [
      "Works with MetaMask, Rabby and any EIP-6963 wallet",
      "Sign-in is free — no gas, no transaction",
      "Persistent stage progression across devices",
    ],
  },
  hive: {
    label:   "HIVE BLOCKCHAIN",
    tagline: "Sign in with your Hive account via Hive Keychain to enter the mines.",
    bullets: [
      "Requires the Hive Keychain browser extension",
      "Signs with your Posting key — no tokens spent",
      "Cross-device progress via server persistence",
    ],
  },
};

const copy = CHAIN_COPY[chain] ?? CHAIN_COPY.solana;

const chip: CSSProperties = {
  display: "inline-block", fontFamily: pixelFont, fontSize: 10,
  color: gold, border: `2px solid ${gold}`, padding: "6px 10px",
  letterSpacing: 2, marginRight: 8,
};

function Bullet({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: bodyFont, fontSize: 20, color: cream }}>
      <span style={{ width: 14, height: 14, background: gold, transform: "rotate(45deg)", display: "inline-block", flexShrink: 0 }} />
      <span>{label}</span>
    </div>
  );
}

function LoginPanel() {
  if (chain === "hive")      return <LoginHive />;
  if (chain === "robinhood") return <LoginRobinhood />;
  return <LoginSolana />;
}

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", background: bg, color: cream, fontFamily: pixelFont }}>
      {/* NAV */}
      <nav style={{ maxWidth: 1240, margin: "0 auto", padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px dashed ${hairline}` }}>
        <Link href="/" style={{ fontFamily: pixelFont, fontSize: 12, color: cream, letterSpacing: 2, textDecoration: "none" }}>
          BOOM MINER
        </Link>
        <Link href="/" style={{ fontFamily: pixelFont, fontSize: 10, color: cream, textDecoration: "none", letterSpacing: 2, opacity: 0.75 }}>
          ← BACK
        </Link>
      </nav>

      <section
        style={{
          maxWidth: 1180, margin: "0 auto", padding: "80px 28px 120px",
          display: "grid", gridTemplateColumns: "minmax(0,1.05fr) minmax(0,0.95fr)",
          gap: 72, alignItems: "center",
        }}
      >
        {/* LORE SIDE */}
        <div>
          <div style={{ marginBottom: 24 }}>
            <span style={chip}>{copy.label}</span>
            <span style={chip}>$BMCOIN</span>
          </div>
          <h1 style={{ fontFamily: pixelFont, fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.15, margin: 0, color: cream, textShadow: "5px 5px 0 #000", letterSpacing: -1 }}>
            ENTER THE<br />MINES
          </h1>
          <p style={{ fontFamily: bodyFont, fontSize: 22, marginTop: 26, maxWidth: 460, lineHeight: 1.55, color: cream, opacity: 0.75 }}>
            {copy.tagline}
          </p>
          <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 18 }}>
            {copy.bullets.map((b) => <Bullet key={b} label={b} />)}
          </div>
        </div>

        {/* LOGIN CARD — chain determined at server render time */}
        <div>
          <LoginPanel />
          <PlayDemoButton />
        </div>
      </section>
    </main>
  );
}
