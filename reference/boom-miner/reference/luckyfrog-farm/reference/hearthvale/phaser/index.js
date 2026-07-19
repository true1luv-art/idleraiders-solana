/**
 * Hearthvale Phaser engine — /phaser route entry point
 *
 * Usage:
 *   import startPhaserGame from 'phaser'
 *   const game = startPhaserGame('phaser-container')
 *
 * Registry keys injected at startup:
 *   socket      — optional, null when running standalone
 *   playerState — optional player data
 */
import * as Phaser from 'phaser'
import { LoaderScene } from './scenes/LoaderScene.js'
import { FarmScene }   from './scenes/FarmScene.js'

/**
 * Instantiate the Phaser game.
 * @param {string|HTMLElement} parent
 * @param {object} [opts]
 * @param {object|null} [opts.socket]
 * @param {object}      [opts.playerState]
 * @returns {Phaser.Game}
 */
export default function startPhaserGame(parent, opts = {}) {
  const { socket = null, playerState = {} } = opts

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 800,
    height: 800,
    backgroundColor: '#1a1a1a',
    pixelArt: true,
    render: {
      antialias: false,
      roundPixels: true,
    },
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
        gravity: { y: 0 },
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [],
    callbacks: {
      postBoot(game) {
        game.registry.set('socket',      socket)
        game.registry.set('playerState', playerState)

        game.scene.add('LoaderScene', LoaderScene, true)
        game.scene.add('FarmScene',   FarmScene,   false)
      },
    },
  })
}
