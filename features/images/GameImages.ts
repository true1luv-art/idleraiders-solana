// Game UI assets (background, logo, pack)
export const GAME_UI_IMAGES = {
  background: '/assets/bg_dark_fantasy.jpg',
  cardBack: '/assets/card_back.png',
  logo: '/assets/idle_raiders_logo.png',
  heroesPack: '/assets/idle_raiders_heroes_pack.png',
}

export const getGameUIImage = (imageKey) => {
  return GAME_UI_IMAGES[imageKey] || null
}

export default GAME_UI_IMAGES
