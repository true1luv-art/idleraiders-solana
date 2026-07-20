// ─────────────────────────────────────────────
// Achievements Configuration
// Authoritative source — includes coin/shard rewards
// ─────────────────────────────────────────────

export const ACHIEVEMENTS = [
  // ── Combat ──────────────────────────────────
  { id: 'first_blood',   title: 'First Blood',     description: 'Complete your first mission',   icon: '⚔️',  category: 'combat',      check: (s: Record<string, any>) => s.totalMissions >= 1,        rewards: { coins: 100 } },
  { id: 'veteran',       title: 'Veteran Raider',  description: 'Complete 50 missions',          icon: '🗡️', category: 'combat',      check: (s: Record<string, any>) => s.totalMissions >= 50,       rewards: { coins: 500 } },
  { id: 'centurion',     title: 'Centurion',        description: 'Complete 100 missions',         icon: '🛡️', category: 'combat',      check: (s: Record<string, any>) => s.totalMissions >= 100,      rewards: { coins: 1000 } },
  { id: 'warlord',       title: 'Warlord',          description: 'Complete 500 missions',         icon: '👑',  category: 'combat',      check: (s: Record<string, any>) => s.totalMissions >= 500,      rewards: { coins: 5000 } },
  { id: 'boss_slayer',   title: 'Boss Slayer',      description: 'Deal 10,000 boss damage',       icon: '🐉',  category: 'combat',      check: (s: Record<string, any>) => s.totalBossDamage >= 10000,   rewards: { coins: 250 } },
  { id: 'dragon_killer', title: 'Dragon Killer',   description: 'Deal 100,000 boss damage',      icon: '💀',  category: 'combat',      check: (s: Record<string, any>) => s.totalBossDamage >= 100000,  rewards: { coins: 1500 } },
  { id: 'godslayer',     title: 'Godslayer',        description: 'Deal 1,000,000 boss damage',    icon: '⚡',  category: 'combat',      check: (s: Record<string, any>) => s.totalBossDamage >= 1000000, rewards: { coins: 10000 } },

  // ── Collection ───────────────────────────────
  { id: 'collector_10',  title: 'Collector',        description: 'Own 10 unique cards',           icon: '🃏',  category: 'collection',  check: (s: Record<string, any>) => s.uniqueCards >= 10,  rewards: { coins: 200 } },
  { id: 'collector_25',  title: 'Hoarder',          description: 'Own 25 unique cards',           icon: '📚',  category: 'collection',  check: (s: Record<string, any>) => s.uniqueCards >= 25,  rewards: { coins: 750 } },
  { id: 'collector_50',  title: 'Archivist',        description: 'Own 50 unique cards',           icon: '🏛️', category: 'collection',  check: (s: Record<string, any>) => s.uniqueCards >= 50,  rewards: { coins: 2000 } },

  // ── Progression ──────────────────────────────
  { id: 'lvl_5',   title: 'Apprentice', description: 'Reach level 5',   icon: '🌱', category: 'progression', check: (s: Record<string, any>) => s.playerLevel >= 5,   rewards: { coins: 150 } },
  { id: 'lvl_10',  title: 'Journeyman', description: 'Reach level 10',  icon: '🌿', category: 'progression', check: (s: Record<string, any>) => s.playerLevel >= 10,  rewards: { coins: 300, shards: 3 } },
  { id: 'lvl_25',  title: 'Expert',     description: 'Reach level 25',  icon: '🌳', category: 'progression', check: (s: Record<string, any>) => s.playerLevel >= 25,  rewards: { coins: 1000, shards: 12 } },
  { id: 'lvl_50',  title: 'Master',     description: 'Reach level 50',  icon: '⭐', category: 'progression', check: (s: Record<string, any>) => s.playerLevel >= 50,  rewards: { coins: 3000 } },
  { id: 'lvl_100', title: 'Legend',     description: 'Reach level 100', icon: '🌟', category: 'progression', check: (s: Record<string, any>) => s.playerLevel >= 100, rewards: { coins: 10000 } },

  // ── Social ───────────────────────────────────
  { id: 'guild_member', title: 'Guild Member', description: 'Join a guild', icon: '🏰', category: 'social', check: (s: Record<string, any>) => s.inGuild, rewards: { coins: 500 } },
] as const
