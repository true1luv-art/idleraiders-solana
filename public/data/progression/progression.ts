/* =========================================================
   ACHIEVEMENTS
========================================================= */

export const ACHIEVEMENTS = [
  // ── Combat Achievements ─────────────────────────────────────
  {
    id: 'first_blood',
    title: 'First Blood',
    description: 'Complete your first mission',
    icon: '⚔️',
    category: 'combat',
    check: (s) => s.totalMissions >= 1,
    rewards: { coins: 100 },
  },
  {
    id: 'veteran',
    title: 'Veteran Raider',
    description: 'Complete 50 missions',
    icon: '🗡️',
    category: 'combat',
    check: (s) => s.totalMissions >= 50,
    rewards: { coins: 500 },
  },
  {
    id: 'centurion',
    title: 'Centurion',
    description: 'Complete 100 missions',
    icon: '🛡️',
    category: 'combat',
    check: (s) => s.totalMissions >= 100,
    rewards: { coins: 1000 },
  },
  {
    id: 'warlord',
    title: 'Warlord',
    description: 'Complete 500 missions',
    icon: '👑',
    category: 'combat',
    check: (s) => s.totalMissions >= 500,
    rewards: { coins: 5000 },
  },
  {
    id: 'boss_slayer',
    title: 'Boss Slayer',
    description: 'Deal 10,000 boss damage',
    icon: '🐉',
    category: 'combat',
    check: (s) => s.totalBossDamage >= 10000,
    rewards: { coins: 250 },
  },
  {
    id: 'dragon_killer',
    title: 'Dragon Killer',
    description: 'Deal 100,000 boss damage',
    icon: '💀',
    category: 'combat',
    check: (s) => s.totalBossDamage >= 100000,
    rewards: { coins: 1500 },
  },
  {
    id: 'godslayer',
    title: 'Godslayer',
    description: 'Deal 1,000,000 boss damage',
    icon: '⚡',
    category: 'combat',
    check: (s) => s.totalBossDamage >= 1000000,
    rewards: { coins: 10000 },
  },

  // ── Collection Achievements ─────────────────────────────────
  {
    id: 'collector_10',
    title: 'Collector',
    description: 'Own 10 unique cards',
    icon: '🃏',
    category: 'collection',
    check: (s) => s.uniqueCards >= 10,
    rewards: { coins: 200 },
  },
  {
    id: 'collector_25',
    title: 'Hoarder',
    description: 'Own 25 unique cards',
    icon: '📚',
    category: 'collection',
    check: (s) => s.uniqueCards >= 25,
    rewards: { coins: 750 },
  },
  {
    id: 'collector_50',
    title: 'Archivist',
    description: 'Own 50 unique cards',
    icon: '🏛️',
    category: 'collection',
    check: (s) => s.uniqueCards >= 50,
    rewards: { coins: 2000 },
  },

  // ── Progression Achievements ────────────────────────────────
  {
    id: 'lvl_5',
    title: 'Apprentice',
    description: 'Reach level 5',
    icon: '🌱',
    category: 'progression',
    check: (s) => s.playerLevel >= 5,
    rewards: { coins: 150 },
  },
  {
    id: 'lvl_10',
    title: 'Journeyman',
    description: 'Reach level 10',
    icon: '🌿',
    category: 'progression',
    check: (s) => s.playerLevel >= 10,
    rewards: { coins: 300 },
  },
  {
    id: 'lvl_25',
    title: 'Expert',
    description: 'Reach level 25',
    icon: '🌳',
    category: 'progression',
    check: (s) => s.playerLevel >= 25,
    rewards: { coins: 1000 },
  },
  {
    id: 'lvl_50',
    title: 'Master',
    description: 'Reach level 50',
    icon: '⭐',
    category: 'progression',
    check: (s) => s.playerLevel >= 50,
    rewards: { coins: 3000 },
  },
  {
    id: 'lvl_100',
    title: 'Legend',
    description: 'Reach level 100',
    icon: '🌟',
    category: 'progression',
    check: (s) => s.playerLevel >= 100,
    rewards: { coins: 10000 },
  },

  // ── Social Achievements ─────────────────────────────────────
  {
    id: 'guild_member',
    title: 'Guild Member',
    description: 'Join a guild',
    icon: '🏰',
    category: 'social',
    check: (s) => s.inGuild,
    rewards: { coins: 500 },
  },
]

/* =========================================================
   GUILDS
========================================================= */

// Guild XP system - XP is consumed on level up (progressive like player XP)
// Max level is 15, max cumulative XP is 1,000,000
// Buffs: xpBonus, materialBonus, energyRegen, bossDamage (all percentages as decimals)
// Target: 50% for XP, Material, Energy at level 15 (~3.5% per level)
export const GUILD_LEVELS = [
  // Level 1: Starting guild
  { level: 1, xpRequired: 0, unlock: 'Guild access', cumulative: 0, xpBonus: 0, materialBonus: 0, energyRegen: 0, bossDamage: 0 },
  
  // Level 2: First milestone - 5K XP
  { level: 2, xpRequired: 5_000, unlock: '+4% XP bonus', cumulative: 5_000, xpBonus: 0.04, materialBonus: 0, energyRegen: 0, bossDamage: 0 },
  
  // Level 3: 10K XP (15K cumulative)
  { level: 3, xpRequired: 10_000, unlock: '+4% material bonus', cumulative: 15_000, xpBonus: 0.04, materialBonus: 0.04, energyRegen: 0, bossDamage: 0 },
  
  // Level 4: 15K XP (30K cumulative)
  { level: 4, xpRequired: 15_000, unlock: '+8% XP bonus', cumulative: 30_000, xpBonus: 0.08, materialBonus: 0.04, energyRegen: 0, bossDamage: 0 },
  
  // Level 5: 20K XP (50K cumulative)
  { level: 5, xpRequired: 20_000, unlock: '+4% energy regen', cumulative: 50_000, xpBonus: 0.08, materialBonus: 0.04, energyRegen: 0.04, bossDamage: 0 },
  
  // Level 6: 30K XP (80K cumulative)
  { level: 6, xpRequired: 30_000, unlock: '+12% material bonus', cumulative: 80_000, xpBonus: 0.12, materialBonus: 0.12, energyRegen: 0.08, bossDamage: 0 },
  
  // Level 7: 40K XP (120K cumulative)
  { level: 7, xpRequired: 40_000, unlock: '+16% XP bonus', cumulative: 120_000, xpBonus: 0.16, materialBonus: 0.12, energyRegen: 0.08, bossDamage: 0 },
  
  // Level 8: 50K XP (170K cumulative)
  { level: 8, xpRequired: 50_000, unlock: '+5% boss damage', cumulative: 170_000, xpBonus: 0.20, materialBonus: 0.16, energyRegen: 0.12, bossDamage: 0.05 },
  
  // Level 9: 60K XP (230K cumulative)
  { level: 9, xpRequired: 60_000, unlock: '+20% energy regen', cumulative: 230_000, xpBonus: 0.24, materialBonus: 0.20, energyRegen: 0.20, bossDamage: 0.05 },
  
  // Level 10: 70K XP (300K cumulative) - Major milestone
  { level: 10, xpRequired: 70_000, unlock: '+28% XP bonus', cumulative: 300_000, xpBonus: 0.28, materialBonus: 0.24, energyRegen: 0.24, bossDamage: 0.05 },
  
  // Level 11: 80K XP (380K cumulative)
  { level: 11, xpRequired: 80_000, unlock: '+28% material bonus', cumulative: 380_000, xpBonus: 0.32, materialBonus: 0.28, energyRegen: 0.28, bossDamage: 0.05 },
  
  // Level 12: 100K XP (480K cumulative)
  { level: 12, xpRequired: 100_000, unlock: '+10% boss damage', cumulative: 480_000, xpBonus: 0.36, materialBonus: 0.32, energyRegen: 0.32, bossDamage: 0.10 },
  
  // Level 13: 120K XP (600K cumulative)
  { level: 13, xpRequired: 120_000, unlock: '+40% XP bonus', cumulative: 600_000, xpBonus: 0.40, materialBonus: 0.36, energyRegen: 0.36, bossDamage: 0.10 },
  
  // Level 14: 150K XP (750K cumulative)
  { level: 14, xpRequired: 150_000, unlock: '+44% energy regen', cumulative: 750_000, xpBonus: 0.44, materialBonus: 0.44, energyRegen: 0.44, bossDamage: 0.10 },
  
  // Level 15: 250K XP (1M cumulative) - MAX LEVEL
  { level: 15, xpRequired: 250_000, unlock: 'Max guild level', cumulative: 1_000_000, xpBonus: 0.50, materialBonus: 0.50, energyRegen: 0.50, bossDamage: 0.15 },
]

export const GUILDS = {
  LEVELS: GUILD_LEVELS,
  MAX_LEVEL: 15,
  MAX_MEMBERS: 30,
  CREATION_FEE: 10000,
}

/* =========================================================
   FINAL EXPORT
========================================================= */

export const PROGRESSION_DATA = {
  ACHIEVEMENTS,
  GUILDS,
}

export default PROGRESSION_DATA
