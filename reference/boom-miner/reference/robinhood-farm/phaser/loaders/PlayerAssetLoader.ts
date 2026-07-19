import type Phaser from 'phaser'

const SPR = 'assets/phaser/sprites'
const FW  = 96
const FH  = 64

export const PlayerAssetLoader = {
  load(scene: Phaser.Scene) {
    // ── Player: human spr_ sprites ────────────────────────────────────────
    scene.load.spritesheet('player_idle',    `${SPR}/spr_idle_strip9.png`,    { frameWidth: FW, frameHeight: FH })
    scene.load.spritesheet('player_walk',    `${SPR}/spr_walking_strip8.png`, { frameWidth: FW, frameHeight: FH })
    scene.load.spritesheet('player_mine',    `${SPR}/spr_mining_strip10.png`, { frameWidth: FW, frameHeight: FH })
    scene.load.spritesheet('player_axe',     `${SPR}/spr_axe_strip10.png`,    { frameWidth: FW, frameHeight: FH })
    scene.load.spritesheet('player_doing',   `${SPR}/spr_doing_strip8.png`,   { frameWidth: FW, frameHeight: FH })
    scene.load.spritesheet('player_casting', `${SPR}/spr_casting_strip15.png`,{ frameWidth: FW, frameHeight: FH })
    scene.load.spritesheet('player_caught',  `${SPR}/spr_caught_strip10.png`, { frameWidth: FW, frameHeight: FH })
    scene.load.spritesheet('player_waiting', `${SPR}/spr_waiting_strip9.png`, { frameWidth: FW, frameHeight: FH })
    scene.load.spritesheet('player_reeling', `${SPR}/spr_reeling_strip13.png`,{ frameWidth: FW, frameHeight: FH })

    // ── NPCs: use the human idle sheet ───────────────────────────────────
    scene.load.spritesheet('npc_base',       `${SPR}/spr_idle_strip9.png`,    { frameWidth: FW, frameHeight: FH })
  },
}
