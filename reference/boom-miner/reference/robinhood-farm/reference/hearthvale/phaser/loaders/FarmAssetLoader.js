/**
 * FarmAssetLoader
 * Loads the Tiled tilemap, tileset image, resource node sprites, and UI corners.
 * Called only during preload().
 *
 * Map: assets/phaser/maps/island.json
 *   50×50 tiles, 16 px per tile → 800×800 px world.
 *   Layers: water, sand, land, barn, decor2, decor (all tile layers — no object layers).
 *   Tileset: spr_tileset_sunnysideworld_16px.png, firstgid 1, internal name "sunnyside".
 *
 * Resource / building node positions are NOT in the map — they are registered
 * separately (future wiring phase). For the prototype the node collections are empty.
 */
export const FarmAssetLoader = {
  /** @param {Phaser.Scene} scene */
  load(scene) {
    this._loadTilemap(scene)
    this._loadResourceNodes(scene)
    this._loadUICorners(scene)
    this._loadAudio(scene)
  },

  _loadTilemap(scene) {
    scene.load.image('tiles', 'assets/phaser/tiles/spr_tileset_sunnysideworld_16px.png')
    scene.load.tilemapTiledJSON('island', 'assets/phaser/maps/island.json')
  },

  _loadResourceNodes(scene) {
    // ── Node images — intact ──────────────────────────────────────────────────
    scene.load.image('stone_rock', 'assets/resources/stone_node.png')
    scene.load.image('iron_rock',  'assets/resources/iron_node.png')
    scene.load.image('gold_rock',  'assets/resources/gold_node.png')

    // ── Node images — depleted (swapped in on 3rd hit, replaces opacity fade) ─
    scene.load.image('stone_empty', 'assets/resources/stone/stone_empty.png')
    scene.load.image('iron_empty',  'assets/resources/iron/iron_empty.png')
    scene.load.image('gold_empty',  'assets/resources/gold/gold_empty.png')
    scene.load.image('tree_empty',  'assets/resources/tree/tree_empty.png')

    // ── Strike progress overlays (shown above the rock on each hit) ──────────
    // hit 1 → quarter.png, hit 2 → almost.png, hit 3 → rock fades out (depleted)
    scene.load.image('progress_quarter', 'assets/ui/progress/quarter.png')
    scene.load.image('progress_almost',  'assets/ui/progress/almost.png')

    // ── Drop spritesheets — 637×66 px, 7 frames of 91×66 each ────────────────
    scene.load.spritesheet('drop_stone', 'assets/resources/stone/stone_drop.png',
      { frameWidth: 91, frameHeight: 66 })
    scene.load.spritesheet('drop_iron',  'assets/resources/iron/iron_drop.png',
      { frameWidth: 91, frameHeight: 66 })
    scene.load.spritesheet('drop_gold',  'assets/resources/gold/gold_drop.png',
      { frameWidth: 91, frameHeight: 66 })
    scene.load.spritesheet('drop_tree',  'assets/resources/tree/tree_drop.png',
      { frameWidth: 91, frameHeight: 66 })

    // ── Tree node image 32×32 px (same model as stone/iron/gold) ──────────
    scene.load.image('tree_node', 'assets/resources/tree_node.png')

    // Plot sprites — mirrors Soil.tsx (soil2.png) and Field.tsx (lock.png)
    scene.load.image('plot_soil', 'assets/land/soil2.png')
    scene.load.image('plot_lock', 'assets/skills/lock.png')

    // ── Crop lifecycle images — mirrors LIFECYCLE in plant.ts ─────────────────
    // Three stages per crop: seedling (<50% grown), almost (>=50%), ready (100%).
    // Image key convention: crop_{name}_{stage}  e.g. crop_potato_seedling
    const CROP_NAMES = [
      'potato', 'pumpkin', 'carrot', 'cabbage', 'beetroot',
      'cauliflower', 'parsnip', 'radish', 'wheat', 'kale', 'sunflower',
    ]
    for (const name of CROP_NAMES) {
      // Sunflower uses "planted.png" as its ready-stage image; all other crops use "plant.png"
      const readyFile = name === 'sunflower' ? 'planted.png' : 'plant.png'
      scene.load.image(`crop_${name}_seedling`, `assets/crops/${name}/seedling.png`)
      scene.load.image(`crop_${name}_almost`,   `assets/crops/${name}/almost.png`)
      scene.load.image(`crop_${name}_ready`,    `assets/crops/${name}/${readyFile}`)
    }

    // Building sprites — same assets used by Town/House components
    scene.load.image('building_house',       'assets/buildings/house.png')
    scene.load.image('building_market',      'assets/buildings/market_building.png')
    scene.load.image('building_blacksmith',  'assets/buildings/blacksmith_building.png')
    scene.load.image('building_kitchen',     'assets/buildings/kitchen_building.png')
    scene.load.image('building_bank',        'assets/buildings/tailor.gif')
    scene.load.image('building_wishing_well','assets/buildings/wishing_well.png')

    // Animal walk-cycle spritesheets — 4 frames of 32×32 each
    scene.load.spritesheet('animal_chicken', 'assets/phaser/sprites/animals/spr_deco_chicken_01_strip4.png', { frameWidth: 32, frameHeight: 32 })
    scene.load.spritesheet('animal_sheep',   'assets/phaser/sprites/animals/spr_deco_sheep_01_strip4.png',   { frameWidth: 32, frameHeight: 32 })
    scene.load.spritesheet('animal_cow',     'assets/phaser/sprites/animals/spr_deco_cow_strip4.png',        { frameWidth: 32, frameHeight: 32 })

    // Building banner icons — one per building type
    scene.load.image('icon_player',  'assets/icons/player.png')
    scene.load.image('icon_plant',   'assets/icons/plant.png')
    scene.load.image('icon_hammer',  'assets/icons/hammer.png')
    scene.load.image('icon_token',   'assets/icons/token.png')
    scene.load.image('icon_lock',    'assets/skills/lock.png')
    scene.load.image('icon_town',    'assets/icons/town.png')

    // Animal expression icons (shown above sprites in Phaser)
    scene.load.image('expr_stress',  'assets/icons/expression_stress.png')
    scene.load.image('expr_happy',   'assets/icons/expression_happy.png')
    scene.load.image('expr_alerted', 'assets/icons/expression_alerted.png')

    // Animal feed crop icons (shown above hungry sprites)
    scene.load.image('feed_wheat',   'assets/crops/wheat/crop.png')
    scene.load.image('feed_kale',    'assets/crops/kale/crop.png')
    scene.load.image('feed_cabbage', 'assets/crops/cabbage/crop.png')
  },

  _loadUICorners(scene) {
    // Actual path: public/assets/ui/select/
    scene.load.image('selectbox_tl', 'assets/ui/select/selectbox_tl.png')
    scene.load.image('selectbox_tr', 'assets/ui/select/selectbox_tr.png')
    scene.load.image('selectbox_bl', 'assets/ui/select/selectbox_bl.png')
    scene.load.image('selectbox_br', 'assets/ui/select/selectbox_br.png')
  },

  _loadAudio(scene) {
    scene.load.audio('sfx_chop',        'assets/sound-effects/chop.mp3')
    scene.load.audio('sfx_tree_fall',   'assets/sound-effects/tree_fall.mp3')
    scene.load.audio('sfx_mining',      'assets/sound-effects/mining.mp3')
    scene.load.audio('sfx_mining_fall', 'assets/sound-effects/mining_fall.mp3')
  },
}
