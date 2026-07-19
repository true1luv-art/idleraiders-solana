/**
 * AnimationConfig
 * Pure animation frame-data. No scene.load.* calls here.
 * Asset loading lives in loaders/. Animation registration lives in systems/AnimationSystem.js.
 */

export const ANIMATION_CONFIG = {
  PLAYER: {
    IDLE:    { key: 'player_idle',    frames: { start: 0, end: 8 }, frameRate: 8,  repeat: -1 }, // spr_idle_strip9    (9 frames)
    WALK:    { key: 'player_walk',    frames: { start: 0, end: 7 }, frameRate: 8,  repeat: -1 }, // spr_walking_strip8 (8 frames)
    MINE:    { key: 'player_mine',    frames: { start: 0, end: 9 }, frameRate: 10, repeat: 0  }, // spr_mining_strip10 (10 frames)
    AXE:     { key: 'player_axe',     frames: { start: 0, end: 9 }, frameRate: 10, repeat: 0  }, // spr_axe_strip10    (10 frames)
    DOING:   { key: 'player_doing',   frames: { start: 0, end: 7 }, frameRate: 8,  repeat: 0  }, // spr_doing_strip8   (8 frames)
    WAITING: { key: 'player_waiting', frames: { start: 0, end: 8 }, frameRate: 8,  repeat: -1 }, // spr_waiting_strip9 (9 frames)
  },

  FISHING: {
    CASTING: { key: 'player_casting', frames: { start: 0, end: 14 }, frameRate: 10, repeat: 0  }, // spr_casting_strip15 (15 frames)
    REELING: { key: 'player_reeling', frames: { start: 0, end: 12 }, frameRate: 10, repeat: 0  }, // spr_reeling_strip13 (13 frames)
    CAUGHT:  { key: 'player_caught',  frames: { start: 0, end: 9  }, frameRate: 10, repeat: 0  }, // spr_caught_strip10  (10 frames)
  },

  BLACKSMITH: {
    HAMMER: { key: 'blacksmith_hammer', frames: { start: 0, end: 22 }, frameRate: 23, repeat: -1 },
  },

  MERCHANT: {
    IDLE: { key: 'merchant_idle', frames: { start: 0, end: 8 }, frameRate: 9, repeat: -1 },
  },
}
