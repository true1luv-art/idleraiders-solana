/**
 * LoaderScene
 * Simple boot scene. Always goes to FarmScene (no dungeon session check needed
 * for this standalone /phaser route).
 */
import * as Phaser from 'phaser'

export class LoaderScene extends Phaser.Scene {
  constructor() {
    super('LoaderScene')
  }

  create() {
    const { centerX, centerY } = this.cameras.main
    this._text = this.add
      .text(centerX, centerY, 'Loading...', {
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    window.dispatchEvent?.(new CustomEvent('phaser-scene-start', { detail: { sceneName: 'LoaderScene' } }))

    // Short delay so the canvas settles, then start the farm
    this.time.delayedCall(400, () => {
      if (this.sys?.settings?.status > 0) this.scene.start('FarmScene')
    })

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this._text?.destroy())
  }
}
