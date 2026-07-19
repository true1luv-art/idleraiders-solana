import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";

export const metadata: Metadata = {
  title: "Boom Miner — Pixel Auto-Battler for $BMCOIN",
  description:
    "Boom Miner: pixel auto-battler where heroes plant bombs, crack chests and mine $BMCOIN.",
  openGraph: {
    title: "Boom Miner — Pixel Auto-Battler for $BMCOIN",
    description: "Plant bombs. Crack chests. Mine $BMCOIN across procedurally generated stages.",
    type: "website",
  },
};

/* ---------- shared styles ---------- */
const pixelFont = "'Press Start 2P', monospace";
const bodyFont = "'VT323', monospace";

const gold = "#facc15";
const cream = "#f5e9c4";
const bg = "#0a0a0a";
const panelBg = "rgba(255,255,255,0.03)";
const panelBorder = "#000";
const hairline = "rgba(245,233,196,0.2)";

const RARITY_COLORS: Record<string, string> = {
  Common: "#9ca3af",
  Uncommon: "#22c55e",
  Rare: "#3b82f6",
  Epic: "#a855f7",
  Legendary: "#facc15",
  Mythic: "#ff3b6b",
};

/* ---------- data ---------- */
const CHARACTERS: { name: string; sprite: string }[] = [
  { name: "Alpha Bomber",    sprite: "ember" },
  { name: "Spark",           sprite: "frostling" },
  { name: "Shadow",          sprite: "shade" },
  { name: "Nature Guardian", sprite: "thornwood" },
  { name: "Iron Crusher",    sprite: "sablewing" },
  { name: "Mystic",          sprite: "blossom" },
  { name: "Desert Hunter",   sprite: "dune" },
  { name: "Crimson Warrior", sprite: "crimsonhorn" },
  { name: "Santa",           sprite: "sparkjolt" },
  { name: "Gnome",           sprite: "ironclad" },
];

const HERO_ROWS = [
  { name: "Common",    drop: "80%",    power: "1–3",   speed: "1–3",   stamina: "1–3",   bombs: 1, range: "1",    energy: "100–300" },
  { name: "Uncommon",  drop: "14%",    power: "3–6",   speed: "3–6",   stamina: "3–6",   bombs: 2, range: "2–3",  energy: "300–600" },
  { name: "Rare",      drop: "5%",     power: "6–8",   speed: "6–8",   stamina: "6–8",   bombs: 3, range: "3–5",  energy: "600–800" },
  { name: "Epic",      drop: "0.995%", power: "8–11",  speed: "8–11",  stamina: "8–11",  bombs: 4, range: "5–7",  energy: "800–1,100" },
  { name: "Legendary", drop: "0.005%", power: "11–16", speed: "11–16", stamina: "11–16", bombs: 6, range: "7–11", energy: "1,100–1,600" },
];

const CHEST_ROWS = [
  { name: "Common",    drop: "80%",  hp: 80,   coins: 220 },
  { name: "Rare",      drop: "13%",  hp: 160,  coins: 660 },
  { name: "Epic",      drop: "5%",   hp: 320,  coins: 2_200 },
  { name: "Legendary", drop: "1.6%", hp: 640,  coins: 8_800 },
  { name: "Mythic",    drop: "0.4%", hp: 1280, coins: 44_000 },
];

/* ---------- components ---------- */
function Divider() {
  return (
    <div style={{ maxWidth: 1080, margin: "96px auto 0", borderTop: `1px dashed ${hairline}` }} />
  );
}

function Section({ id, title, subtitle, children }: { id?: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <>
      <Divider />
      <section id={id} style={{ maxWidth: 1080, width: "100%", margin: "48px auto 0", padding: "0 4px" }}>
        <h2 style={{ fontFamily: pixelFont, fontSize: 20, color: gold, margin: 0, textShadow: "3px 3px 0 #000", textTransform: "uppercase" }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontFamily: bodyFont, fontSize: 20, color: cream, opacity: 0.7, marginTop: 12, maxWidth: 720 }}>
            {subtitle}
          </p>
        )}
        <div style={{ marginTop: 28 }}>{children}</div>
      </section>
    </>
  );
}

function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: panelBg, border: `4px solid ${panelBorder}`, boxShadow: "6px 6px 0 #000", padding: 20, ...style }}>
      {children}
    </div>
  );
}

const th: CSSProperties = {
  fontFamily: pixelFont, fontSize: 10, color: gold, textAlign: "left",
  padding: "12px 10px", borderBottom: `2px solid ${gold}`, whiteSpace: "nowrap",
};
const td: CSSProperties = {
  fontFamily: bodyFont, fontSize: 16, color: cream,
  padding: "10px", borderBottom: `1px solid #222`,
};

function RarityBadge({ name }: { name: string }) {
  const color = RARITY_COLORS[name] ?? cream;
  return (
    <span style={{ display: "inline-block", padding: "4px 8px", background: color, color: "#000", fontFamily: pixelFont, fontSize: 9, border: "2px solid #000" }}>
      {name.toUpperCase()}
    </span>
  );
}

/* ---------- page ---------- */
export default function Page() {
  return (
    <main style={{ minHeight: "100vh", background: bg, color: cream, fontFamily: pixelFont }}>

      {/* TOP NAV */}
      <nav style={{ maxWidth: 1240, margin: "0 auto", padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
        <img src="/assets/brand_logo.png" alt="Boom Miner" style={{ height: 48, width: "auto", imageRendering: "pixelated" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
          {[{ l: "MECHANICS", h: "#mechanics" }, { l: "RARITIES", h: "#rarities" }, { l: "MARKET", h: "#market" }].map((n) => (
            <a key={n.l} href={n.h} style={{ fontFamily: pixelFont, fontSize: 10, color: cream, textDecoration: "none", letterSpacing: 2, opacity: 0.75 }}>
              {n.l}
            </a>
          ))}
          <Link href="/login" style={{ fontFamily: pixelFont, fontSize: 10, color: gold, textDecoration: "none", letterSpacing: 2, padding: "10px 16px", border: `2px solid ${gold}` }}>
            LOG IN
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", padding: "80px 20px 60px", background: "radial-gradient(ellipse at 50% 40%, rgba(34,90,34,0.35) 0%, rgba(10,10,10,0) 60%)", overflow: "hidden" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <h1 style={{ fontFamily: pixelFont, fontSize: "clamp(40px, 6.4vw, 88px)", lineHeight: 1.15, margin: 0, color: gold, textShadow: "6px 6px 0 #000", letterSpacing: -1 }}>
            BOOM DEEP.<br />
            MINER FASTER.<br />
            COLLECT $BMCOIN.
          </h1>
          <p style={{ fontFamily: bodyFont, fontSize: 24, marginTop: 36, maxWidth: 720, marginInline: "auto", lineHeight: 1.5, color: cream, opacity: 0.75 }}>
            A pixel-art auto-battler where your gacha miners tunnel through hostile biomes to extract the motherlode.
          </p>
          <div style={{ marginTop: 44, display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/login" style={{ fontFamily: pixelFont, padding: "20px 36px", background: gold, color: "#000", border: "4px solid #000", boxShadow: "6px 6px 0 #000", textDecoration: "none", fontSize: 13, letterSpacing: 1 }}>
              START MINING →
            </Link>
            <a href="#mechanics" style={{ fontFamily: pixelFont, padding: "20px 36px", background: "#000", color: cream, border: `4px solid ${cream}`, boxShadow: `6px 6px 0 ${gold}`, textDecoration: "none", fontSize: 13, letterSpacing: 1 }}>
              HOW TO PLAY
            </a>
          </div>
          <div style={{ maxWidth: 960, margin: "72px auto 0", borderTop: `1px dashed ${hairline}`, paddingTop: 32, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 24 }}>
            {[{ l: "World Map", v: "41 × 25" }, { l: "Unique Heroes", v: "10 UNITS" }, { l: "Rarity Tiers", v: "5 LEVELS" }, { l: "Total Mint", v: "500,000" }].map((s) => (
              <div key={s.l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: pixelFont, fontSize: 9, color: cream, opacity: 0.5, letterSpacing: 2, marginBottom: 12 }}>{s.l.toUpperCase()}</div>
                <div style={{ fontFamily: pixelFont, fontSize: 16, color: gold, textShadow: "2px 2px 0 #000" }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHARACTER ROSTER — CYCLING MARQUEE */}
      <section aria-labelledby="roster-heading" style={{ borderTop: `1px dashed ${hairline}`, borderBottom: `1px dashed ${hairline}`, padding: "72px 0", overflow: "hidden" }}>
        <style>{`
          @keyframes bm-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          .bm-marquee-track { display: flex; gap: 32px; width: max-content; animation: bm-marquee 40s linear infinite; }
          .bm-marquee-viewport:hover .bm-marquee-track { animation-play-state: paused; }
          .bm-hero-card { flex: 0 0 auto; width: 180px; border: 4px solid #000; background: rgba(255,255,255,0.03); box-shadow: 6px 6px 0 #000; padding: 20px 16px 18px; text-align: center; }
          .bm-hero-sprite { width: 96px; height: 120px; margin: 0 auto; image-rendering: pixelated; background-image: var(--sprite-url); background-size: 288px 480px; background-position: -96px 0; }
        `}</style>
        <div style={{ maxWidth: 1080, margin: "0 auto 40px", padding: "0 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div>
            <h2 id="roster-heading" style={{ fontFamily: pixelFont, fontSize: 20, color: gold, margin: 0, textShadow: "3px 3px 0 #000", letterSpacing: 1 }}>THE ROSTER</h2>
            <p style={{ fontFamily: bodyFont, fontSize: 20, color: cream, opacity: 0.7, marginTop: 10, maxWidth: 560 }}>
              Ten pixel miners tunnel out of the incubator. Roll for rarity, deploy your crew.
            </p>
          </div>
          <div style={{ fontFamily: pixelFont, fontSize: 10, color: cream, opacity: 0.55, letterSpacing: 2 }}>{CHARACTERS.length} UNITS</div>
        </div>
        <div className="bm-marquee-viewport">
          <div className="bm-marquee-track">
            {[...CHARACTERS, ...CHARACTERS].map((c, i) => (
              <div className="bm-hero-card" key={`${c.sprite}-${i}`}>
                <div className="bm-hero-sprite" style={{ ["--sprite-url" as never]: `url(/assets/characters/${c.sprite}.png)` }} aria-label={c.name} role="img" />
                <div style={{ marginTop: 16, fontFamily: pixelFont, fontSize: 10, color: gold, letterSpacing: 1, textShadow: "2px 2px 0 #000", lineHeight: 1.6, minHeight: 32 }}>
                  {c.name.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INCUBATOR MINTING ANIMATION */}
      <section aria-labelledby="incubator-heading" style={{ borderBottom: `1px dashed ${hairline}`, padding: "88px 28px", background: "radial-gradient(ellipse at center, rgba(250,204,21,0.06) 0%, transparent 70%)", position: "relative", overflow: "hidden" }}>
        <style>{`
          @keyframes bm-incubator-frames { from { background-position: 0px 0px; } to { background-position: -1920px 0px; } }
          @keyframes bm-incubator-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(250,204,21,0), 8px 8px 0 #000; } 50% { box-shadow: 0 0 80px 10px rgba(250,204,21,0.45), 8px 8px 0 #000; } }
          @keyframes bm-spark { 0% { transform: translate(-50%, 0) scale(0.4); opacity: 0; } 20% { opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) scale(1.2); opacity: 0; } }
          .bm-inc-stage { width: 480px; height: 512px; background-image: url(/assets/incubator.png); background-repeat: no-repeat; background-size: 1920px 512px; background-position: 0px 0px; image-rendering: pixelated; animation: bm-incubator-frames 0.7s steps(4) infinite, bm-incubator-glow 2.4s ease-in-out infinite; border: 6px solid #000; }
          .bm-inc-spark { position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; background: #facc15; box-shadow: 0 0 6px #facc15; border-radius: 50%; animation: bm-spark 1.6s ease-out infinite; }
        `}</style>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 48, alignItems: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative", padding: 24 }}>
              <div className="bm-inc-stage" aria-label="Incubator minting a hero" role="img" />
              {[{ dx: "-120px", dy: "-140px", d: "0s" }, { dx: "140px", dy: "-120px", d: "0.4s" }, { dx: "-90px", dy: "160px", d: "0.8s" }, { dx: "110px", dy: "150px", d: "1.2s" }, { dx: "0px", dy: "-180px", d: "0.2s" }].map((s, i) => (
                <span key={i} className="bm-inc-spark" style={{ ["--dx" as never]: s.dx, ["--dy" as never]: s.dy, animationDelay: s.d }} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: pixelFont, fontSize: 10, color: gold, letterSpacing: 3, marginBottom: 14, opacity: 0.85 }}>LIVE MINT — 500,000 $BMCOIN</div>
            <h2 id="incubator-heading" style={{ fontFamily: pixelFont, fontSize: 28, color: cream, margin: 0, lineHeight: 1.3, textShadow: "4px 4px 0 #000" }}>
              THE<br /><span style={{ color: gold }}>INCUBATOR</span>
            </h2>
            <p style={{ fontFamily: bodyFont, fontSize: 20, lineHeight: 1.6, color: cream, opacity: 0.85, marginTop: 18, maxWidth: 480 }}>
              Drop coin, crack the shell. Each mint rolls a fresh hero on the drop table —
              rarity, stats and range are decided the moment your bomb-egg hatches.
            </p>
            <div style={{ marginTop: 26, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, maxWidth: 460 }}>
              {[{ l: "PACK", v: "×1 / ×5 / ×10" }, { l: "COST", v: "500K EA" }, { l: "ROLLS", v: "5 TIERS" }].map((s) => (
                <div key={s.l} style={{ border: `3px solid ${cream}`, padding: "10px 8px", textAlign: "center", background: "#000", boxShadow: "4px 4px 0 #000" }}>
                  <div style={{ fontFamily: pixelFont, fontSize: 8, color: cream, opacity: 0.55, letterSpacing: 2 }}>{s.l}</div>
                  <div style={{ fontFamily: pixelFont, fontSize: 10, color: gold, marginTop: 6, textShadow: "2px 2px 0 #000" }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MECHANICS */}
      <Section id="mechanics" title="HOW THE GAME WORKS" subtitle="Deploy heroes to the map, they act on their own — pathing, bombing, and looting.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <Panel><h3 style={{ fontFamily: pixelFont, fontSize: 12, color: gold, marginTop: 0 }}>1. MINT A CREW</h3><p style={{ fontFamily: bodyFont, fontSize: 16, lineHeight: 1.6 }}>Spend 500,000 $BMCOIN in the shop incubator to mint a new hero. Rarity is rolled on the drop table below — legendaries are exceptionally rare (1 in 20,000).</p></Panel>
          <Panel><h3 style={{ fontFamily: pixelFont, fontSize: 12, color: gold, marginTop: 0 }}>2. DEPLOY TO THE MAP</h3><p style={{ fontFamily: bodyFont, fontSize: 16, lineHeight: 1.6 }}>Send heroes to WORK from the roster. Each deployed hero auto-pathfinds toward chests, plants bombs, and dodges its own explosions. No player input required.</p></Panel>
          <Panel><h3 style={{ fontFamily: pixelFont, fontSize: 12, color: gold, marginTop: 0 }}>3. CRACK CHESTS, EARN COIN</h3><p style={{ fontFamily: bodyFont, fontSize: 16, lineHeight: 1.6 }}>Every exploded bomb consumes 1 energy. Chests destroyed drop $BMCOIN based on rarity. Clear every chest on a stage to auto-advance to the next.</p></Panel>
        </div>
      </Section>

      {/* HERO RARITIES */}
      <Section id="rarities" title="HERO RARITIES & ATTRIBUTES" subtitle="Every hero has 5 stats. Values roll within the ranges below on mint.">
        <Panel style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr>
                <th style={th}>Rarity</th><th style={th}>Drop %</th><th style={th}>Power</th>
                <th style={th}>Speed</th><th style={th}>Stamina</th><th style={th}>Bombs</th>
                <th style={th}>Range</th><th style={th}>Max Energy</th>
              </tr>
            </thead>
            <tbody>
              {HERO_ROWS.map((r) => (
                <tr key={r.name}>
                  <td style={td}><RarityBadge name={r.name} /></td>
                  <td style={td}>{r.drop}</td><td style={td}>{r.power}</td>
                  <td style={td}>{r.speed}</td><td style={td}>{r.stamina}</td>
                  <td style={td}>{r.bombs}</td><td style={td}>{r.range}</td>
                  <td style={td}>{r.energy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 16 }}>
          <Panel><div style={{ fontFamily: pixelFont, fontSize: 10, color: gold }}>POWER</div><div style={{ fontFamily: bodyFont, fontSize: 15, marginTop: 6 }}>Damage each bomb deals to chests.</div></Panel>
          <Panel><div style={{ fontFamily: pixelFont, fontSize: 10, color: gold }}>SPEED</div><div style={{ fontFamily: bodyFont, fontSize: 15, marginTop: 6 }}>Movement speed on the map.</div></Panel>
          <Panel><div style={{ fontFamily: pixelFont, fontSize: 10, color: gold }}>STAMINA</div><div style={{ fontFamily: bodyFont, fontSize: 15, marginTop: 6 }}>Determines max energy (×100 per point).</div></Panel>
          <Panel><div style={{ fontFamily: pixelFont, fontSize: 10, color: gold }}>BOMB NUM / RANGE</div><div style={{ fontFamily: bodyFont, fontSize: 15, marginTop: 6 }}>How many bombs can be active + blast tiles.</div></Panel>
        </div>
      </Section>

      {/* CHEST RARITIES */}
      <Section title="CHEST RARITIES & PAYOUTS" subtitle="Rarer chests take more bomb hits but pay out exponentially more $BMCOIN.">
        <Panel style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr><th style={th}>Rarity</th><th style={th}>Spawn %</th><th style={th}>HP</th><th style={th}>$BMCOIN Reward</th></tr>
            </thead>
            <tbody>
              {CHEST_ROWS.map((r) => (
                <tr key={r.name}>
                  <td style={td}><RarityBadge name={r.name} /></td>
                  <td style={td}>{r.drop}</td>
                  <td style={td}>{r.hp.toLocaleString()}</td>
                  <td style={{ ...td, color: gold }}>{r.coins.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </Section>

      {/* ENERGY & REGEN */}
      <Section title="ENERGY & REGENERATION" subtitle="Every bomb costs energy. Rest at Home to recover it.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          <Panel><h3 style={{ fontFamily: pixelFont, fontSize: 12, color: gold, marginTop: 0 }}>MAX ENERGY</h3><p style={{ fontFamily: bodyFont, fontSize: 16, lineHeight: 1.6 }}><span style={{ color: gold }}>Stamina × 100</span> = max energy. A Legendary with 16 Stamina caps at 1,600 energy.</p></Panel>
          <Panel><h3 style={{ fontFamily: pixelFont, fontSize: 12, color: gold, marginTop: 0 }}>CONSUMPTION</h3><p style={{ fontFamily: bodyFont, fontSize: 16, lineHeight: 1.6 }}>Every bomb detonation drains <span style={{ color: gold }}>1 energy</span>. At 0 energy the hero falls asleep and returns Home.</p></Panel>
          <Panel><h3 style={{ fontFamily: pixelFont, fontSize: 12, color: gold, marginTop: 0 }}>REGENERATION</h3><p style={{ fontFamily: bodyFont, fontSize: 16, lineHeight: 1.6 }}>While RESTING at Home, heroes regenerate <span style={{ color: gold }}>+10% of max energy every 5 minutes</span>{" "}(~50 minutes from empty to full).</p></Panel>
          <Panel>
            <h3 style={{ fontFamily: pixelFont, fontSize: 12, color: gold, marginTop: 0 }}>STATUS STATES</h3>
            <ul style={{ fontFamily: bodyFont, fontSize: 16, lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
              <li><span style={{ color: "#22c55e" }}>WORKING</span> — deployed on map</li>
              <li><span style={{ color: "#3b82f6" }}>RESTING</span> — regenerating at Home</li>
              <li><span style={{ color: gold }}>READY</span> — full energy, idle</li>
              <li><span style={{ color: "#ef4444" }}>SLEEPING</span> — 0 energy, must rest</li>
            </ul>
          </Panel>
        </div>
      </Section>

      {/* MARKETPLACE + STAGES */}
      <Section id="market" title="MARKETPLACE & STAGES" subtitle="Trade heroes. Clear stages. Explore new biomes.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <Panel><h3 style={{ fontFamily: pixelFont, fontSize: 12, color: gold, marginTop: 0 }}>MARKETPLACE</h3><p style={{ fontFamily: bodyFont, fontSize: 16, lineHeight: 1.6 }}>Buy heroes directly from other players using $BMCOIN. Filter by rarity, price, and stats through an industrial cyber-mine interface.</p></Panel>
          <Panel><h3 style={{ fontFamily: pixelFont, fontSize: 12, color: gold, marginTop: 0 }}>STAGES & BIOMES</h3><p style={{ fontFamily: bodyFont, fontSize: 16, lineHeight: 1.6 }}>Each stage rotates through a biome — Grassland, Desert, Frozen, Lava, and Void — changing wall and ground palettes while keeping the same chest generation.</p></Panel>
        </div>
      </Section>

      {/* CTA */}
      <div style={{ maxWidth: 720, margin: "80px auto 0", textAlign: "center" }}>
        <h2 style={{ fontFamily: pixelFont, fontSize: 20, color: gold, textShadow: "3px 3px 0 #000" }}>READY TO MINE?</h2>
        <p style={{ fontFamily: bodyFont, fontSize: 20, marginTop: 16, opacity: 0.85 }}>Grab your incubator and start hatching heroes.</p>
        <div style={{ marginTop: 24 }}>
          <Link href="/login" style={{ padding: "18px 40px", background: gold, color: "#000", border: "4px solid #000", boxShadow: "6px 6px 0 #000", textDecoration: "none", fontSize: 14, display: "inline-block" }}>
            ENTER THE MINES
          </Link>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 60, fontSize: 10, opacity: 0.5 }}>© BOOM MINER — PROTOTYPE</div>
    </main>
  );
}
