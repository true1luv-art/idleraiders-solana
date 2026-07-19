import { useCallback } from 'react'

const COMING_SOON = { success: false, message: 'Marketplace coming soon' }

export const useMarketActions = () => {
  const getListings = useCallback(async () => COMING_SOON, [])
  const buyCard = useCallback(async (_listingId: string) => COMING_SOON, [])
  const sellCard = useCallback(async (_cardId: string, _quantity: number, _price: number) => COMING_SOON, [])
  const cancelListing = useCallback(async (_listingId: string) => COMING_SOON, [])
  const getRecentSales = useCallback(async () => COMING_SOON, [])

  return {
    getListings,
    buyCard,
    sellCard,
    cancelListing,
    getRecentSales,
  }
}

export default useMarketActions
