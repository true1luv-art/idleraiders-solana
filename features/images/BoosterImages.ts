// Pack images are in public/assets/
export const PACK_IMAGES = {
  heroes_pack: '/assets/idle_raiders_heroes_pack.png',
  card_back: '/assets/card_back.png',
}

export const getPackImage = (packId: string): string | null => {
  return PACK_IMAGES[packId as keyof typeof PACK_IMAGES] || null
}

// Keep legacy aliases so existing callers (BoosterImages) don't break.
export const BOOSTER_IMAGES = PACK_IMAGES
export const getBoosterImage = getPackImage

export default PACK_IMAGES
