/**
 * PlayerAssetLoader
 * Loads all player spritesheets. Called only during preload().
 * All spritesheets are 96×64 px per frame.
 *
 * Sprites (assets/phaser/sprites/):
 *   spr_idle_strip9.png      (9 frames)  — idle
 *   spr_walking_strip8.png   (8 frames)  — walking
 *   spr_mining_strip10.png   (10 frames) — mining stone/iron/gold
 *   spr_axe_strip10.png      (10 frames) — chopping trees
 *   spr_doing_strip8.png     (8 frames)  — doing / action
 *   spr_waiting_strip9.png   (9 frames)  — waiting / idle variant
 *   spr_casting_strip15.png  (15 frames) — fishing: cast rod
 *   spr_reeling_strip13.png  (13 frames) — fishing: reel in
 *   spr_caught_strip10.png   (10 frames) — fishing: fish caught
 */

const SPR = 'assets/phaser/sprites'
const FW  = 96
const FH  = 64

export const PlayerAssetLoader = {
  /** @param {Phaser.Scene} scene */
  load(scene) {
    scene.load.spritesheet('player_idle',    `${SPR}/spr_idle_strip9.png`,    { frameWidth: FW, frameHeight: FH })
    scene.load.spritesheet('player_walk',    `${SPR}/spr_walking_strip8.png`, { frameWidth: FW, frameHeight: FH })
    scene.load.spritesheet('player_mine',    `${SPR}/spr_mining_strip10.png`, { frameWidth: FW, frameHeight: FH })
    scene.load.spritesheet('player_axe',     `${SPR}/spr_axe_strip10.png`,    { frameWidth: FW, frameHeight: FH })
    scene.load.spritesheet('player_doing',   `${SPR}/spr_doing_strip8.png`,   { frameWidth: FW, frameHeight: FH })
    scene.load.spritesheet('player_waiting', `${SPR}/spr_waiting_strip9.png`, { frameWidth: FW, frameHeight: FH })
    scene.load.spritesheet('player_casting', `${SPR}/spr_casting_strip15.png`, { frameWidth: FW, frameHeight: FH })
    scene.load.spritesheet('player_reeling', `${SPR}/spr_reeling_strip13.png`, { frameWidth: FW, frameHeight: FH })
    scene.load.spritesheet('player_caught',  `${SPR}/spr_caught_strip10.png`,  { frameWidth: FW, frameHeight: FH })
  },
}
