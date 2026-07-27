"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Swords, Target, Clover, Crown } from "lucide-react";
import Image from "next/image";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const SectionTitle = ({ id, children, sub }: { id?: string; children: React.ReactNode; sub?: string }) => (
  <div id={id} className="mb-8 scroll-mt-24">
    <h2 className="font-display text-xl md:text-3xl font-bold text-foreground">{children}</h2>
    {sub && <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{sub}</p>}
    <div className="mt-3 h-px bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />
  </div>
);

const FormulaBlock = ({ label, formula, notes }: { label: string; formula: string; notes?: string[] }) => (
  <div
    className="rounded-xl border border-border p-4 md:p-5 mb-3"
    style={{ background: "linear-gradient(145deg, hsl(230 12% 14%), hsl(230 12% 9%))" }}
  >
    <p className="text-xs md:text-sm font-semibold text-foreground mb-2">{label}</p>
    <code className="block rounded-lg bg-background/60 border border-border/50 px-4 py-3 text-xs md:text-sm font-mono text-primary whitespace-pre-wrap">
      {formula}
    </code>
    {notes && (
      <ul className="mt-3 space-y-1">
        {notes.map((n, i) => (
          <li key={i} className="text-[11px] md:text-xs text-muted-foreground flex items-start gap-2">
            <span className="text-primary/60 mt-0.5">•</span> {n}
          </li>
        ))}
      </ul>
    )}
  </div>
);

const TableRow = ({ cells, header }: { cells: string[]; header?: boolean }) => (
  <tr className={header ? "border-b border-primary/20" : "border-b border-border/30"}>
    {cells.map((c, i) => (
      <td key={i} className={`px-3 py-2.5 text-xs md:text-sm ${header ? "font-display font-bold text-primary" : i === 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
        {c}
      </td>
    ))}
  </tr>
);

const DocsPage = () => {
  const router = useRouter();

  const tocItems = [
    { id: "stats", label: "Stat System" },
    { id: "rewards", label: "Reward Formulas" },
    { id: "fatigue", label: "Fatigue System" },
    { id: "energy", label: "Energy & Potions" },
    { id: "boosters", label: "Booster Stacking" },
    { id: "bosses", label: "Boss Mechanics" },
    { id: "dungeons", label: "Dungeon Factors" },
    { id: "territories", label: "Territories" },
    { id: "training", label: "Training System" },
    { id: "rarities", label: "Card Rarities" },
    { id: "leveling", label: "XP & Leveling" },
    { id: "packs", label: "Card Packs" },
    { id: "faq", label: "FAQ & Tips" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-xl" style={{ background: "hsl(230 15% 8% / 0.9)" }}>
        <div className="mx-auto max-w-5xl flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="h-4 w-px bg-border/50" />
          <Image src="/assets/idle_raiders_logo.png" alt="Idle Raiders" width={24} height={24} className="h-6 w-auto" />
          <span className="font-display text-sm font-bold text-foreground">Documentation</span>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12 flex gap-8">
        {/* Sidebar TOC — desktop only */}
        <aside className="hidden lg:block w-52 shrink-0 sticky top-20 self-start">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-bold mb-3">On this page</p>
          <nav className="space-y-1">
            {tocItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block text-xs text-muted-foreground hover:text-primary transition-colors py-1 px-2 rounded-md hover:bg-secondary/50"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-12 md:space-y-16">
          <motion.div {...fadeUp}>
            <h1 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-3">
              Game Mechanics & Formulas
            </h1>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">
              Full transparency on every calculation in Idle Raiders. This document covers all stats, reward formulas,
              diminishing returns, and progression systems used in the game.
            </p>
          </motion.div>

          {/* ═══ STAT SYSTEM ═══ */}
          <motion.section {...fadeUp}>
            <SectionTitle id="stats" sub="Every non-booster card contributes to four core stats. Stats scale with card type, rarity, and class.">
              Stat System
            </SectionTitle>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: <Swords size={20} className="text-primary" />, name: "Raid Power (RP)", desc: "Total combat strength. Determines damage dealt to bosses and bonus token rewards from dungeons." },
                { icon: <Target size={20} className="text-primary" />, name: "Mastery", desc: "Counters fatigue penalty on bonus rewards. High mastery maintains full rewards even with high fatigue." },
                { icon: <Clover size={20} className="text-primary" />, name: "Luck", desc: "Affects potion drop probability and determines mastery gains from training sessions." },
                { icon: <Crown size={20} className="text-primary" />, name: "GM (Global Modifier)", desc: "General multiplier stat. Applies +2% per GM point. Only Rare+ cards contribute GM." },
              ].map((s) => (
                <div
                  key={s.name}
                  className="rounded-xl border border-border p-4 flex items-start gap-3"
                  style={{ background: "linear-gradient(145deg, hsl(230 12% 14%), hsl(230 12% 9%))" }}
                >
                  {s.icon}
                  <div>
                    <p className="text-sm font-display font-bold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ═══ REWARD FORMULAS ═══ */}
          <motion.section {...fadeUp}>
            <SectionTitle id="rewards" sub="How dungeon mission rewards (tokens) are calculated.">
              Reward Formulas
            </SectionTitle>

            <FormulaBlock
              label="Dungeon Token Reward Calculation"
              formula={`BaseReward = mission.baseTokenReward × dungeon.dungeonFactor
EnergyScale = mission.energyCost / 15
BonusReward = RaidPower × 0.1 × EnergyScale
RepeatMultiplier = max(0.1, 1 − dailyRepeatCount × 0.15)
FatigueMultiplier = (fatigue === 0) ? 1 : min(1, Mastery / max(1, Fatigue))
AdjustedBonus = BonusReward × RepeatMult × FatigueMult
FinalTokens = floor(BaseReward + random(0, AdjustedBonus))`}
              notes={[
                "Base reward is always guaranteed regardless of penalties",
                "Bonus pool scales with energy spent — Scout = 1×, Patrol = 1.67×, Expedition = 3×, Siege = 4×, War = 5.33×",
                "10% of your Raid Power is the per-15-energy bonus baseline",
                "Repeating the same dungeon+mission combo today reduces bonus by 15% per repeat (min 10% remaining)",
                "Daily repeat counter resets at midnight Manila time (UTC+8)",
                "Mastery counters fatigue — high mastery maintains full bonus rewards",
                "If Mastery is 0 and Fatigue > 0, bonus is reduced to 0",
              ]}
            />
          </motion.section>

          {/* ═══ FATIGUE ═══ */}
          <motion.section {...fadeUp}>
            <SectionTitle id="fatigue" sub="Completing missions accumulates fatigue, which affects bonus rewards.">
              Fatigue System
            </SectionTitle>

            <FormulaBlock
              label="Fatigue Accumulation"
              formula={`FatigueGain = mission.fatiguePerMission
NewFatigue = CurrentFatigue + FatigueGain

Fatigue per mission type:
  Scout:        10
  Patrol:       20
  Expedition:   35
  Siege:        60
  War Campaign: 90`}
              notes={[
                "Each dungeon mission type has a fixed fatigue cost",
                "Longer missions add more fatigue",
                "Fatigue only affects bonus rewards, not base rewards",
                "Training sessions and boss raids do not add fatigue",
              ]}
            />

            <FormulaBlock
              label="Fatigue Reward Multiplier"
              formula={`if (Fatigue === 0) return 1.0
if (Mastery === 0 && Fatigue > 0) return 0
FatigueMultiplier = min(1, Mastery / max(1, Fatigue))`}
              notes={[
                "Mastery stat directly counters fatigue",
                "At 0 fatigue: 100% bonus rewards",
                "At Mastery ≥ Fatigue: 100% bonus rewards",
                "At Mastery < Fatigue: Reduced proportionally (Mastery/Fatigue)",
                "Example: 50 Mastery, 100 Fatigue = 50% bonus multiplier",
              ]}
            />
          </motion.section>

          {/* ═══ ENERGY ═══ */}
          <motion.section {...fadeUp}>
            <SectionTitle id="energy" sub="Energy powers missions. Potions provide powerful temporary effects.">
              Energy and Potions
            </SectionTitle>

            <FormulaBlock
              label="Energy Regeneration"
              formula={`Regen Interval: 180 seconds (3 minutes) per 1 energy
Max Energy: 100 (fixed)`}
              notes={[
                "Energy regenerates passively, even while offline",
                "Regeneration is computed on each player state fetch",
                "Energy Potions instantly refill energy to full (100)",
                "Full refill from 0 takes 5 hours (300 minutes)",
              ]}
            />

            <div className="rounded-xl border border-border overflow-hidden mb-3" style={{ background: "linear-gradient(145deg, hsl(230 12% 14%), hsl(230 12% 9%))" }}>
              <table className="w-full">
                <tbody>
                  <TableRow cells={["Potion", "Effect", "Obtained"]} header />
                  <TableRow cells={["Energy Potion", "Refill energy to 100", "Story quest drop"]} />
                  <TableRow cells={["EXP Potion", "2× XP for next mission", "Story quest drop"]} />
                </tbody>
              </table>
            </div>

            <FormulaBlock
              label="Potion Drop Chance"
              formula={`BASE_POTION_CHANCE = 0.10 (10%)
MAX_POTION_CHANCE = 0.25 (25% hard cap)

LuckBonus = min(1.5, Luck / 4000)
DropChance = min(0.25, 0.10 × (1 + LuckBonus))

On drop: 60% EXP Potion, 40% Energy Potion`}
              notes={[
                "Base drop chance is 10% per story quest completion",
                "Luck increases drop rate linearly up to +150% bonus (caps at 6000 Luck)",
                "Hard cap at 25% drop chance regardless of luck",
                "Distribution when a drop occurs: 60% EXP Potion, 40% Energy Potion",
              ]}
            />
          </motion.section>

          {/* ═══ BOOSTERS ═══ */}
          <motion.section {...fadeUp}>
            <SectionTitle id="boosters" sub="Booster cards provide percentage bonuses with asymptotic diminishing returns.">
              Booster Stacking
            </SectionTitle>

            <FormulaBlock
              label="Booster Soft Cap Formula"
              formula={`RawBoost = Σ (BOOSTER_MULTIPLIERS[rarity] × card.quantity)
EffectiveBoost = RawBoost / (1 + RawBoost / 200)
FinalMultiplier = 1 + (EffectiveBoost / 100)

BOOSTER_MULTIPLIERS (per card):
  Common:    +2%     Epic:      +15%
  Uncommon:  +5%     Legendary: +25%
  Rare:      +10%`}
              notes={[
                "Booster percentages per card are set by rarity",
                "Formula uses smooth asymptotic diminishing returns — never hits the cap but approaches it",
                "Asymptotic hard cap: 200% effective boost (3.0× multiplier)",
                "Example: Raw 100% → ~67% effective, Raw 200% → 100% effective, Raw 400% → ~133% effective",
                "Three boost classes: xpBoost, materialBoost, energyBoost (each tracked separately)",
                "Booster cards are identified by type='booster' and a class field",
              ]}
            />
          </motion.section>

          {/* ═══ BOSS MECHANICS ═══ */}
          <motion.section {...fadeUp}>
            <SectionTitle id="bosses" sub="Boss raids are 30-minute missions that deal damage and earn XP.">
              Boss Mechanics
            </SectionTitle>

            <FormulaBlock
              label="Boss Damage Calculation"
              formula={`BaseDamage = floor(RaidPower × (0.8 + random() × 0.4))
FinalDamage = max(1, BaseDamage)`}
              notes={[
                "Raid Power directly translates to boss damage",
                "Damage varies from 80% to 120% of Raid Power (random variance)",
                "Boss raids last 30 minutes (1800 seconds) and cost 30 energy",
                "Each raid earns 45 XP (before XP boosters)",
              ]}
            />

            <div className="rounded-xl border border-border overflow-hidden" style={{ background: "linear-gradient(145deg, hsl(230 12% 14%), hsl(230 12% 9%))" }}>
              <table className="w-full">
                <tbody>
                  <TableRow cells={["Boss", "Tier", "Territory"]} header />
                  <TableRow cells={["Goblin King", "1", "Evershade"]} />
                  <TableRow cells={["Spider Queen", "1", "Evershade"]} />
                  <TableRow cells={["Soul Reaver", "2", "Sunspire Citadel"]} />
                  <TableRow cells={["Lich King", "2", "Sunspire Citadel"]} />
                  <TableRow cells={["Frost Giant", "3", "Frosthold"]} />
                  <TableRow cells={["Ancient Treant", "3", "Frosthold"]} />
                  <TableRow cells={["Ember Colossus", "4", "Ember City"]} />
                  <TableRow cells={["Ash Lord", "4", "Ember City"]} />
                  <TableRow cells={["Demon Lord", "5", "Iron Citadel"]} />
                  <TableRow cells={["Ancient Dragon", "5", "Iron Citadel"]} />
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* ═══ DUNGEON FACTORS ═══ */}
          <motion.section {...fadeUp}>
            <SectionTitle id="dungeons" sub="Dungeons provide tokens and XP. Mission types determine duration and rewards.">
              Dungeon System
            </SectionTitle>

            <div className="rounded-xl border border-border overflow-hidden mb-3" style={{ background: "linear-gradient(145deg, hsl(230 12% 14%), hsl(230 12% 9%))" }}>
              <table className="w-full">
                <tbody>
                  <TableRow cells={["Dungeon", "Level Req", "Factor", "Territory"]} header />
                  <TableRow cells={["Goblin Cave", "1", "1.2×", "Evershade"]} />
                  <TableRow cells={["Spider Den", "16", "1.4×", "Evershade"]} />
                  <TableRow cells={["Graveyard of Souls", "31", "1.6×", "Sunspire Citadel"]} />
                  <TableRow cells={["Crypt of the Undying", "46", "1.8×", "Sunspire Citadel"]} />
                  <TableRow cells={["Ice Cavern", "61", "2.0×", "Frosthold"]} />
                  <TableRow cells={["Dark Forest", "76", "2.2×", "Frosthold"]} />
                  <TableRow cells={["Molten Quarry", "91", "2.4×", "Ember City"]} />
                  <TableRow cells={["Ashen Fortress", "106", "2.6×", "Ember City"]} />
                  <TableRow cells={["Demon's Gate", "121", "2.8×", "Iron Citadel"]} />
                  <TableRow cells={["Dragon's Lair", "136", "3.0×", "Iron Citadel"]} />
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-border overflow-hidden mb-3" style={{ background: "linear-gradient(145deg, hsl(230 12% 14%), hsl(230 12% 9%))" }}>
              <table className="w-full">
                <tbody>
                  <TableRow cells={["Mission", "Duration", "Energy", "Base Tokens", "Fatigue"]} header />
                  <TableRow cells={["Scout", "5 min", "15", "50", "10"]} />
                  <TableRow cells={["Patrol", "15 min", "25", "100", "20"]} />
                  <TableRow cells={["Expedition", "30 min", "45", "250", "35"]} />
                  <TableRow cells={["Siege", "1 hr", "60", "500", "60"]} />
                  <TableRow cells={["War Campaign", "3 hr", "80", "750", "90"]} />
                </tbody>
              </table>
            </div>

            <FormulaBlock
              label="Mission Level Requirements"
              formula={`MissionLevelReq = dungeon.requiredLevel + MISSION_LEVEL_OFFSETS[missionId]

MISSION_LEVEL_OFFSETS:
  scout:      +0
  patrol:     +3
  expedition: +6
  siege:      +9
  war:        +12

Final Base Tokens = mission.baseTokenReward × dungeon.dungeonFactor`}
              notes={[
                "Each dungeon has a base level requirement; each mission type adds an offset",
                "Base token reward is multiplied by the dungeon's factor (1.2× to 3.0×)",
                "Higher dungeons give more base tokens but require higher levels",
                "Mission types stack on the same dungeon — you unlock more missions as you level up",
              ]}
            />

            <FormulaBlock
              label="XP Earned Per Mission"
              formula={`MissionMinutes = floor(mission.duration / 60)
BaseXP = MissionMinutes (1 XP per minute)
EffectiveXpBoost = xpBoostRaw / (1 + xpBoostRaw / 200)
FinalXP = round(BaseXP × (1 + EffectiveXpBoost / 100) × expPotionMultiplier)`}
              notes={[
                "Dungeon XP = 1 XP per minute of mission duration",
                "Boss raids give a fixed 45 XP (BOSS_RAID_XP constant)",
                "Story quests give a fixed 90 XP (STORY_QUEST_XP constant)",
                "Training sessions give 2 XP per minute (120 XP per hour)",
                "EXP Potion doubles the XP earned on its active mission (×2 multiplier)",
              ]}
            />
          </motion.section>

          {/* ═══ TERRITORIES ═══ */}
          <motion.section {...fadeUp}>
            <SectionTitle id="territories" sub="Five territories unlock as you level up. Each contains story quests, dungeons, and bosses.">
              Territories and Story
            </SectionTitle>

            <div className="rounded-xl border border-border overflow-hidden mb-3" style={{ background: "linear-gradient(145deg, hsl(230 12% 14%), hsl(230 12% 9%))" }}>
              <table className="w-full">
                <tbody>
                  <TableRow cells={["Territory", "Unlock Level", "Dungeons", "Bosses"]} header />
                  <TableRow cells={["Evershade (T1)", "1", "Goblin Cave, Spider Den", "Goblin King, Spider Queen"]} />
                  <TableRow cells={["Sunspire Citadel (T2)", "16", "Graveyard of Souls, Crypt of the Undying", "Soul Reaver, Lich King"]} />
                  <TableRow cells={["Frosthold (T3)", "31", "Ice Cavern, Dark Forest", "Frost Giant, Ancient Treant"]} />
                  <TableRow cells={["Ember City (T4)", "61", "Molten Quarry, Ashen Fortress", "Ember Colossus, Ash Lord"]} />
                  <TableRow cells={["Iron Citadel (T5)", "91", "Demon's Gate, Dragon's Lair", "Demon Lord, Ancient Dragon"]} />
                </tbody>
              </table>
            </div>

            <FormulaBlock
              label="Story Quest Mechanics"
              formula={`Each territory has 5 story quests (25 quests total)
GlobalQuestIndex = (territoryIndex × 5) + (questNumber - 1)
Duration: 60 min, Energy: 60

First Completion (isFirstCompletion = true):
  CardDropRate = 15%
  if (cardDropped) → Progress advances, reward card added
  else → Must retry quest (progress blocked)

Replay (isFirstCompletion = false):
  territory.dropRate = { material: 85, card: 15 }
  card roll → Random completed story card from this territory
  material roll → Materials from territory.materialPool (1 per 5-min interval)`}
              notes={[
                "Story progress is tracked as milestones.storyProgress (0-indexed)",
                "First completion has a 15% drop gate — must succeed to advance",
                "Replays give materials (85%) or previously-unlocked story cards (15%)",
                "Each quest awards 90 XP (STORY_QUEST_XP) plus any boost multipliers",
                "Story card replays only include cards you have already unlocked",
              ]}
            />
          </motion.section>

          {/* ═══ TRAINING ═══ */}
          <motion.section {...fadeUp}>
            <SectionTitle id="training" sub="Alternative progression path to earn XP and mastery without combat.">
              Training System
            </SectionTitle>

            <FormulaBlock
              label="Training Configuration"
              formula={`Duration:       60 minutes
Energy Cost:    40
XP per minute:  2 (120 XP per session)

Mastery Formula:
  totalLuck = Σ card.luck (of matching type)
  masteryGained = floor(50 + totalLuck / 100)

Training Types:
  Weapons   → uses Equipment card luck
  Mount     → uses Mount card luck
  Merchant  → uses Transport card luck`}
              notes={[
                "Training uses the same active mission slot as other missions",
                "Each training type scales with Luck from a specific card type",
                "Minimum mastery reward is 50 per session (even with 0 luck)",
                "At 1000 luck for that card type: ~60 mastery per session",
                "Mastery is cumulative and persists across missions",
                "Training sessions grant 120 XP each (2 XP × 60 min)",
              ]}
            />
          </motion.section>

          {/* ═══ RARITIES ═══ */}
          <motion.section {...fadeUp}>
            <SectionTitle id="rarities" sub="Rarity multiplies base stats. Class modifiers further shape each card's identity.">
              Card Rarities
            </SectionTitle>

            <FormulaBlock
              label="Card Stat Generation"
              formula={`CardStats = BaseStats[type] × RarityMultiplier[rarity] × ClassModifier[class]
GM = BaseGM × GMMultiplier[rarity]

BASE STATS (raidPower / mastery / luck / gm):
  Hero:      60 / 30 / 0  / 1
  Equipment: 35 / 0  / 5  / 1
  Mount:     25 / 0  / 15 / 1
  Transport: 0  / 0  / 30 / 1
  Artifact:  25 / 25 / 0  / 1
  Booster:   no stats — provides boost percentages only`}
              notes={[
                "Boosters do NOT contribute stats — only boost percentages",
                "Class modifiers further shape the stat distribution (e.g. Warrior: +20% RP, −20% Mastery)",
                "GM only accumulates from Rare+ cards (common and uncommon give 0 GM)",
              ]}
            />

            <div className="rounded-xl border border-border overflow-hidden mb-3" style={{ background: "linear-gradient(145deg, hsl(230 12% 14%), hsl(230 12% 9%))" }}>
              <table className="w-full">
                <tbody>
                  <TableRow cells={["Rarity", "Stat ×", "GM ×", "Pack Drop Rate"]} header />
                  <TableRow cells={["Common", "1×", "0×", "65.0%"]} />
                  <TableRow cells={["Uncommon", "3×", "0×", "22.0%"]} />
                  <TableRow cells={["Rare", "8×", "1×", "9.0%"]} />
                  <TableRow cells={["Epic", "25×", "3×", "3.5%"]} />
                  <TableRow cells={["Legendary", "100×", "6×", "0.5%"]} />
                  <TableRow cells={["Special", "12×", "2×", "Craft / Story only"]} />
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-xs text-muted-foreground space-y-1">
              <p>• Six card types: <span className="text-foreground font-medium">Hero, Equipment, Mount, Transport, Artifact, Booster</span></p>
              <p>• Non-booster cards can have any rarity (common → legendary). Special rarity is craft or story only.</p>
              <p>• Booster cards have no stats — instead they add percentage bonuses (xpBoost, materialBoost, energyBoost).</p>
            </div>
          </motion.section>

          {/* ═══ LEVELING ═══ */}
          <motion.section {...fadeUp}>
            <SectionTitle id="leveling" sub="Player leveling unlocks territories, dungeons, and features.">
              XP and Leveling
            </SectionTitle>

            <FormulaBlock
              label="XP Required Per Level"
              formula={`getXPForLevel(level) = round(230 × 1.03^(level - 1))

xpToNextLevel(level):
  if (level >= MAX_LEVEL) return Infinity
  return getXPForLevel(level)

calculateLevel(totalXp):
  level = 1, remaining = totalXp
  while (level < MAX_LEVEL && remaining >= getXPForLevel(level)):
    remaining -= getXPForLevel(level)
    level++
  return { level, xp: remaining }`}
              notes={[
                "Max level is 150 (SYSTEM.PLAYER.MAX_LEVEL)",
                "Uses a 3% exponential scaling curve (~1 year of active play to max)",
                "Level 1: 230 XP, Level 50: ~972 XP, Level 100: ~4,108 XP, Level 150: ~17,359 XP",
                "Total XP to reach level 150: ~410,000 XP",
              ]}
            />
          </motion.section>

          {/* ═══ CARD PACKS ═══ */}
          <motion.section {...fadeUp}>
            <SectionTitle id="packs" sub="Purchase card packs to expand your collection.">
              Card Packs
            </SectionTitle>

            <FormulaBlock
              label="Pack Contents and Pricing"
              formula={`Standard Pack (3 cards):
  Price: 2,500 Realm Coins
  All 3 cards roll independently from the standard drop table

DROP RATES:
  Common 65% | Uncommon 23% | Rare 10% | Epic 1.9% | Legendary 0.1%`}
              notes={[
                "Every card in a pack is rolled fully randomly — no guaranteed rarity",
                "Supply limits are enforced by card definitions (some legendaries have caps)",
                "Duplicate cards stack (quantity increases for same cardId)",
                "Cards are minted directly to your inventory on purchase — no intermediate pack to open",
              ]}
            />
          </motion.section>

          {/* ═══ FAQ & TIPS ═══ */}
          <motion.section {...fadeUp}>
            <SectionTitle id="faq" sub="Beginner strategies and frequently asked questions to help you progress faster.">
              FAQ and Beginner Tips
            </SectionTitle>

            <div className="space-y-4">
              <FormulaBlock
                label="Dungeon and Mission Tips"
                formula="Unlock territories → Run missions → Grow your collection → Repeat"
                notes={[
                  "Higher-tier dungeons give much better base tokens (up to 3.0× factor)",
                  "Longer missions (Siege, War) give more tokens per run, but add more fatigue",
                  "Vary your mission types daily to avoid the repeat penalty",
                  "Boss raids earn XP and deal damage — great for leveling up quickly",
                ]}
              />

              <FormulaBlock
                label="Stat Strategy"
                formula="Raid Power + Mastery + Luck + GM → Better rewards at every step"
                notes={[
                  "Raid Power increases boss damage and dungeon bonus tokens",
                  "Mastery counters fatigue — aim for Mastery ≥ Fatigue to keep full bonus",
                  "Luck increases potion drop rate (up to 25% cap) and training mastery gains",
                  "GM provides a +2% global bonus per point (Rare+ cards only)",
                  "Boosters have strong diminishing returns — don't over-invest past ~200% raw",
                ]}
              />

              <div
                className="rounded-xl border border-border p-4 md:p-5"
                style={{ background: "linear-gradient(145deg, hsl(230 12% 14%), hsl(230 12% 9%))" }}
              >
                <p className="text-xs md:text-sm font-semibold text-foreground mb-3">Frequently Asked Questions</p>
                <div className="space-y-3">
                  {[
                    { q: "What should I spend Realm Coins on first?", a: "Buy Standard Packs to grow your card collection. Each card rolls independently — Common 65%, Uncommon 23%, Rare 10%, Epic 1.9%, Legendary 0.1%." },
                    { q: "Is it better to keep duplicate cards?", a: "Yes — duplicates stack and multiply stat contributions. More copies of a card means higher stats across the board." },
                    { q: "How does the daily repeat penalty work?", a: "Running the same dungeon+mission combo multiple times per day reduces the bonus reward by 15% per repeat (min 10% remaining). Resets at midnight Manila time." },
                    { q: "Why didn't my story quest progress?", a: "First-time completion has a 15% card drop gate. If you don't get the card, you must retry the same quest until it drops." },
                    { q: "What does Training do?", a: "Training earns Mastery which counters fatigue. Without Mastery, high fatigue reduces your bonus rewards to zero." },
                  ].map((faq, i) => (
                    <div key={i}>
                      <p className="text-xs font-semibold text-primary">{faq.q}</p>
                      <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Back to top */}
          <div className="pt-8 text-center">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              ↑ Back to top
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DocsPage;
