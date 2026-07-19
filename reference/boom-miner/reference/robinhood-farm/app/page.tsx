import type { Metadata } from "next";
import type React from "react";
import { GamePreview } from "@/components/GamePreview";
import GameStats from "@/components/GameStats";
import StickyNav from "@/components/StickyNav";
import { OuterPanel, InnerPanel } from "@/components/ui/Panel";

const SITE_URL = "https://www.robinhoodfarm.com";

const IMAGES = {
  hero: "/assets/farm-hero.png",
  kitchen: "/assets/buildings/kitchen_building.png",
  og: "/assets/farm-hero.png",
};

export const metadata: Metadata = {
  title: "Robinhood Farm — Farm, Craft & Trade",
  description:
    "Robinhood Farm is a pixel browser RPG where you grow crops, craft goods, and trade in a living player-driven economy. Build your farm. Corner the market.",
  openGraph: {
    title: "Robinhood Farm — Farm, Craft & Trade",
    description: "Grow crops, craft goods, and trade with other players in a living pixel economy.",
    type: "website",
    url: `${SITE_URL}/`,
    images: [{ url: IMAGES.og }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Robinhood Farm — Farm, Craft & Trade",
    description: "Grow crops, craft goods, and trade with other players in a living pixel economy.",
    images: [IMAGES.og],
  },
  alternates: {
    canonical: `${SITE_URL}/`,
  },
};

function PixelButton({
  children,
  variant = "primary",
  href,
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  href?: string;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 px-6 py-4 font-pixel text-xs sm:text-sm uppercase tracking-wide border-2 transition-all duration-150 active:brightness-90";
  const styles =
    variant === "primary"
      ? "bg-neon text-primary-foreground border-neon/60 hover:brightness-110"
      : "bg-card text-neon border-neon hover:bg-neon hover:text-primary-foreground";

  return (
    <a
      href={href}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </a>
  );
}

function Marquee() {
  const items = [
    "PLANT & HARVEST",
    "MASTER SIX SKILLS",
    "FISH THE POND",
    "CARE FOR ANIMALS",
    "COOK HEARTY MEALS",
    "TRADE WITH FARMERS",
    "COMPLETE QUESTS",
  ];
  return (
    <div className="overflow-hidden border-y-2 border-brown-600 bg-brown-600 py-3">
      <div className="flex w-max animate-marquee gap-12 whitespace-nowrap font-pixel text-xs text-white text-shadow">
        {[...items, ...items, ...items, ...items].map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </div>
  );
}

const ACTIVITIES: { title: string; desc: string; image: string; tag: string }[] = [
  {
    title: "Farming",
    desc: "Plant eleven crops, manage grow times, and turn every harvest into food, trade goods, or quest progress.",
    image: "/assets/crops/sunflower/crop.png",
    tag: "Core Loop",
  },
  {
    title: "Gathering",
    desc: "Chop regenerating trees and mine stone, iron, and gold while training two permanent skills.",
    image: "/assets/resources/iron_ore.png",
    tag: "Resources",
  },
  {
    title: "Fishing",
    desc: "Spend stamina at the pond to land fish of different rarity, value, and experience.",
    image: "/assets/fish/fish.png",
    tag: "Chance",
  },
  {
    title: "Husbandry",
    desc: "Feed chickens, cows, sheep, and pigs, then collect farm produce on their production cycles.",
    image: "/assets/animals/cow.gif",
    tag: "Passive",
  },
  {
    title: "Cooking",
    desc: "Transform crops into stamina-restoring meals that keep long farming sessions moving.",
    image: "/assets/foods/pumpkin_soup.png",
    tag: "Crafting",
  },
  {
    title: "Marketplace",
    desc: "Sell to NPCs for certainty or list goods for players, set your price, and read the market.",
    image: "/assets/buildings/market_building.png",
    tag: "Economy",
  },
];

const SKILLS: { name: string; desc: string; image: string }[] = [
  { name: "Farming", desc: "Planting and harvesting", image: "/assets/crops/carrot/crop.png" },
  { name: "Woodcutting", desc: "Chopping renewable trees", image: "/assets/resources/wood.png" },
  { name: "Mining", desc: "Breaking valuable nodes", image: "/assets/resources/gold_ore.png" },
  { name: "Fishing", desc: "Landing pond catches", image: "/assets/fish/fish.png" },
  { name: "Husbandry", desc: "Caring for livestock", image: "/assets/animals/chicken.gif" },
  { name: "Cooking", desc: "Preparing restorative meals", image: "/assets/foods/wheat_bread.png" },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <StickyNav />

      {/* ============ HERO — full-bleed, editorial left-aligned ============ */}
      <section id="top" className="relative flex min-h-[100svh] flex-col overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${IMAGES.hero}')`, imageRendering: "pixelated" }}
          aria-hidden="true"
        />
        {/* Readability overlays */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-brown-100 via-brown-100/40 to-transparent"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-brown-100/70 via-transparent to-transparent"
          aria-hidden="true"
        />

        {/* Headline block — pinned lower-left */}
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-4 pb-16 sm:px-8">
          <h1 className="mt-6 font-pixel text-4xl leading-[1.15] text-white [text-shadow:0_4px_0_rgba(0,0,0,0.6),0_6px_24px_rgba(0,0,0,0.8)] sm:text-5xl md:text-6xl lg:text-7xl">
            FARM.
            <br />
            CRAFT.
            <br />
            <span className="text-neon">TRADE.</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty font-body text-xl leading-relaxed text-white sm:text-2xl [text-shadow:0_2px_8px_rgba(0,0,0,0.9)]">
            Grow crops, gather resources, care for animals, and master a living farm economy.
            Every action builds your story.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <PixelButton variant="primary" href="/login">
              Start Farming
            </PixelButton>
            <PixelButton variant="secondary" href="#how-to-play">
              See How It Works
            </PixelButton>
          </div>

          {/* Identity strip — HUD bar along hero bottom */}
          <div className="mt-14">
            <OuterPanel>
              <InnerPanel className="grid grid-cols-2 divide-brown-700 sm:grid-cols-4 sm:divide-x-2">
                {[
                  { label: "Genre", value: "Browser RPG", accent: "text-neon" },
                  { label: "Mode", value: "Multiplayer", accent: "text-accent" },
                  { label: "Economy", value: "Player-Driven", accent: "text-rose" },
                  { label: "Access", value: "Free to Play", accent: "text-gold" },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col gap-2 p-4 text-center sm:p-5">
                    <span className="font-pixel text-[9px] uppercase text-white/60">{s.label}</span>
                    <span className={`font-pixel text-xs text-shadow sm:text-sm ${s.accent}`}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </InnerPanel>
            </OuterPanel>
          </div>
        </div>
      </section>

      <Marquee />

      {/* Live game stats */}
      <GameStats />

      {/* ============ STORY — asymmetric quest-log layout ============ */}
      <section id="story" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Left — sticky editorial heading */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <p className="font-pixel text-[9px] uppercase tracking-widest text-gold">
                Your land. Your strategy.
              </p>
              <h2 className="mt-4 text-balance font-pixel text-2xl leading-snug text-neon sm:text-3xl">
                A FARM THAT GROWS WITH YOU
              </h2>
              <p className="mt-6 font-body text-xl leading-relaxed text-foreground/70">
                In Robinhood Farm, every plot begins a larger plan. Three loops feed each other —
                and all of them feed your ledger.
              </p>
              <div className="mt-8 overflow-hidden border-4 border-brown-700 bg-brown-400/20 p-2">
                <img
                  src={IMAGES.hero}
                  alt="A Robinhood Farm landscape at sunset"
                  className="aspect-[16/10] w-full object-cover [image-rendering:pixelated]"
                />
              </div>
            </div>
          </div>

          {/* Right — numbered quest-log entries */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            {[
              {
                num: "01",
                title: "PLANT & PLAN",
                body: "Plant seeds, time harvests, and spend stamina wisely. Eleven crops with distinct grow times reward farmers who think a season ahead.",
              },
              {
                num: "02",
                title: "GATHER & CRAFT",
                body: "Chop the forest, mine valuable ore, fish the pond, and cook meals. Every activity trains a permanent skill that compounds over time.",
              },
              {
                num: "03",
                title: "TRADE & PROFIT",
                body: "Sell safely to villagers or take your goods to the player marketplace, where supply, demand, and timing belong to farmers.",
              },
            ].map((step) => (
              <OuterPanel key={step.num}>
                <InnerPanel className="p-6 sm:p-8">
                  <div className="flex items-start gap-5 sm:gap-8">
                    <span className="font-pixel text-2xl text-gold text-shadow sm:text-3xl">
                      {step.num}
                    </span>
                    <div>
                      <h3 className="font-pixel text-sm text-white text-shadow sm:text-base">
                        {step.title}
                      </h3>
                      <p className="mt-3 font-body text-lg leading-relaxed text-white/80 sm:text-xl">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </InnerPanel>
              </OuterPanel>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ACTIVITIES — bento grid ============ */}
      <section id="features" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-8">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-pixel text-[9px] uppercase tracking-widest text-gold">
              One farm, many paths
            </p>
            <h2 className="mt-4 font-pixel text-2xl text-neon sm:text-3xl">
              CHOOSE YOUR
              <br />
              DAILY RHYTHM
            </h2>
          </div>
          <p className="max-w-sm font-body text-xl leading-relaxed text-foreground/70 sm:text-right">
            Six interconnected activities keep every harvest meaningful.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Featured card — Farming spans two rows on desktop */}
          <OuterPanel className="lg:row-span-2">
            <InnerPanel className="flex h-full flex-col p-0">
              <div className="relative overflow-hidden border-b-4 border-brown-700">
                <img
                  src={IMAGES.hero}
                  alt=""
                  className="aspect-video w-full object-cover object-bottom [image-rendering:pixelated] lg:aspect-[4/3]"
                />
                <span className="absolute left-3 top-3 border-2 border-gold bg-brown-100/90 px-2 py-1 font-pixel text-[8px] uppercase text-gold">
                  {ACTIVITIES[0].tag}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-4">
                  <img
                    src={ACTIVITIES[0].image}
                    alt=""
                    className="size-14 object-contain [image-rendering:pixelated]"
                  />
                  <h3 className="font-pixel text-sm text-neon text-shadow">
                    {ACTIVITIES[0].title}
                  </h3>
                </div>
                <p className="mt-4 font-body text-lg leading-relaxed text-white/80 sm:text-xl">
                  {ACTIVITIES[0].desc}
                </p>
              </div>
            </InnerPanel>
          </OuterPanel>

          {/* Remaining five cards — last card spans full remaining row on desktop */}
          {ACTIVITIES.slice(1).map((a, i) => (
            <OuterPanel key={a.title} className={i === 4 ? "sm:col-span-2 lg:col-span-3" : undefined}>
              <InnerPanel className="flex h-full flex-col p-6">
                <div className="flex items-center justify-between">
                  <img
                    src={a.image}
                    alt=""
                    className="size-12 object-contain [image-rendering:pixelated]"
                  />
                  <span className="border-2 border-brown-700 px-2 py-1 font-pixel text-[8px] uppercase text-white/60">
                    {a.tag}
                  </span>
                </div>
                <h3 className="mt-4 font-pixel text-[11px] text-neon text-shadow">{a.title}</h3>
                <p className="mt-3 font-body text-lg leading-relaxed text-white/80">{a.desc}</p>
              </InnerPanel>
            </OuterPanel>
          ))}
        </div>
      </section>

      <GamePreview />

      {/* ============ SKILLS — ledger rows ============ */}
      <section id="skills" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Heading column */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <p className="font-pixel text-[9px] uppercase tracking-widest text-gold">
                Practice becomes power
              </p>
              <h2 className="mt-4 font-pixel text-2xl leading-snug text-neon sm:text-3xl">
                SIX SKILLS.
                <br />
                100 LEVELS EACH.
              </h2>
              <p className="mt-6 font-body text-xl leading-relaxed text-foreground/70">
                Specialize in one craft or become the farmer who can do everything. Max mastery
                grants +20% yield.
              </p>
              <div className="mt-8 hidden lg:block">
                <PixelButton variant="secondary" href="/login">
                  Begin Training
                </PixelButton>
              </div>
            </div>
          </div>

          {/* Ledger column */}
          <div className="lg:col-span-8">
            <OuterPanel>
              <InnerPanel className="divide-y-2 divide-brown-700 p-2">
                {SKILLS.map((skill) => (
                  <div key={skill.name} className="flex items-center gap-4 p-4 sm:gap-6 sm:p-5">
                    <img
                      src={skill.image}
                      alt=""
                      className="size-12 shrink-0 object-contain [image-rendering:pixelated] sm:size-14"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-pixel text-[10px] text-white text-shadow sm:text-xs">
                        {skill.name}
                      </h3>
                      <p className="mt-1 truncate font-body text-base text-white/70 sm:text-lg">
                        {skill.desc}
                      </p>
                    </div>
                    <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
                      <span className="font-pixel text-[8px] uppercase text-gold">
                        LV. 1 → 100
                      </span>
                      <div className="h-3 w-32 border-2 border-brown-700 bg-brown-100">
                        <div className="h-full w-1/5 bg-neon" />
                      </div>
                    </div>
                  </div>
                ))}
              </InnerPanel>
            </OuterPanel>
            <div className="mt-6 lg:hidden">
              <PixelButton variant="secondary" href="/login" className="w-full">
                Begin Training
              </PixelButton>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA — full-width immersive panel ============ */}
      <section id="play" className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
        <OuterPanel className="animate-pulse-glow">
          <InnerPanel className="relative overflow-hidden p-0">
            <img
              src={IMAGES.hero}
              alt=""
              className="absolute inset-0 h-full w-full object-cover [image-rendering:pixelated]"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-brown-100/70" aria-hidden="true" />
            <div className="relative flex flex-col items-center gap-6 px-6 py-16 text-center sm:py-24">
              <img
                src={IMAGES.kitchen}
                alt=""
                className="h-28 w-28 object-contain [image-rendering:pixelated] sm:h-36 sm:w-36"
              />
              <h2 className="text-balance font-pixel text-2xl text-white [text-shadow:0_4px_0_rgba(0,0,0,0.6),0_6px_24px_rgba(0,0,0,0.8)] sm:text-4xl">
                YOUR FIRST HARVEST AWAITS
              </h2>
              <p className="max-w-xl font-body text-xl leading-relaxed text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.9)] sm:text-2xl">
                No downloads required. Play instantly in your browser.
              </p>
              <PixelButton variant="primary" href="/login">
                Enter Robinhood Farm
              </PixelButton>
            </div>
          </InnerPanel>
        </OuterPanel>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-brown-600 bg-brown-100">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-4">
              <img
                src="/images/robinhood-farm-logo-nav.png"
                alt="Robinhood Farm logo"
                className="h-12 w-auto"
              />
              <div className="font-body text-base text-foreground/70">Farm. Craft. Trade.</div>
            </div>
            <nav
              className="flex flex-wrap items-center justify-center gap-5 font-pixel text-[9px] uppercase text-foreground/70"
              aria-label="Footer navigation"
            >
              <a href="#story" className="transition hover:text-neon">
                About
              </a>
              <a href="#features" className="transition hover:text-neon">
                Activities
              </a>
              <a href="#skills" className="transition hover:text-neon">
                Skills
              </a>
            </nav>
            <PixelButton variant="primary" href="/login" className="!text-[10px]">
              Play Now
            </PixelButton>
          </div>
          <div className="mt-8 border-t-2 border-brown-400 pt-6 text-center font-body text-base text-foreground/60">
            &copy; {new Date().getFullYear()} Robinhood Farm &middot; All rights reserved
          </div>
        </div>
      </footer>
    </div>
  );
}
