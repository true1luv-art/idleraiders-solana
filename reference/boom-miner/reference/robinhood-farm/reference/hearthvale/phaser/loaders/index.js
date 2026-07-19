export { PlayerAssetLoader } from './PlayerAssetLoader.js'
export { FarmAssetLoader }  from './FarmAssetLoader.js'

import { PlayerAssetLoader } from './PlayerAssetLoader.js'
import { FarmAssetLoader }   from './FarmAssetLoader.js'

export function loadPlayerAssets(scene) { PlayerAssetLoader.load(scene) }
export function loadFarmAssets(scene)   { FarmAssetLoader.load(scene) }
