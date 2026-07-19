import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useApiActions } from './apiClient'

interface CardSupply {
  [cardId: string]: number
}

interface RevealedCard {
  id: string
  name: string
  rarity: string
  type: string
  subtype?: string
  stats?: Record<string, number>
}

export const usePackActions = () => {
  const { authPost, authGet } = useApiActions()
  const [cardSupply, setCardSupply] = useState<CardSupply>({})
  const [openedCards, setOpenedCards] = useState<RevealedCard[]>([])
  const [openedPackId, setOpenedPackId] = useState<string | null>(null)
  const [isFetchingSupply, setIsFetchingSupply] = useState(false)
  const [isBuyingPacks, setIsBuyingPacks] = useState(false)
  const [isOpeningPack, setIsOpeningPack] = useState(false)

  // Keep split supply maps for backwards compatibility with the packs page UI
  const standardCardSupply: CardSupply = cardSupply
  const boosterCardSupply: CardSupply = cardSupply
  const [availableBoosterSupply, setAvailableBoosterSupply] = useState(0)

  const getCardSupply = useCallback(async () => {
    try {
      const data = await authGet('/api/cards/supply')
      if (data?.supply) {
        setCardSupply(data.supply)
      }
      if (typeof data?.availableBoosterSupply === 'number') {
        setAvailableBoosterSupply(data.availableBoosterSupply)
      }
      return data
    } catch (error) {
      const err = error as Error
      return { success: false, message: err.message }
    }
  }, [authGet])

  const refreshCardSupply = useCallback(async () => {
    setIsFetchingSupply(true)
    try {
      return await getCardSupply()
    } finally {
      setIsFetchingSupply(false)
    }
  }, [getCardSupply])

  /**
   * Buy and immediately open packs in a single request (max 10).
   * Replaces the old separate buyPacks + openPack flow.
   */
  const buyPacks = useCallback(
    async (packId: string, quantity: number, paymentMethod = 'coins') => {
      setIsBuyingPacks(true)
      setIsOpeningPack(true)
      try {
        const qty = Math.max(1, Math.min(10, Math.floor(quantity)))
        const data = await authPost('/api/items/packs', { packId, quantity: qty, paymentMethod })

        if (data?.success === false) {
          toast.error(data.message || 'Failed to purchase packs')
          return data
        }

        setOpenedPackId(packId)
        setOpenedCards(Array.isArray(data?.cards) ? data.cards : [])
        return data
      } catch (error) {
        const err = error as Error
        toast.error(err.message || 'Failed to purchase packs')
        return { success: false, message: err.message }
      } finally {
        setIsBuyingPacks(false)
        setIsOpeningPack(false)
      }
    },
    [authPost],
  )

  /**
   * Alias kept for backwards compatibility with existing UI call sites.
   * Internally delegates to buyPacks since purchase now immediately mints cards.
   */
  const openPack = useCallback(
    async (packId: string, quantity: number = 1, paymentMethod = 'coins') => {
      return buyPacks(packId, quantity, paymentMethod)
    },
    [buyPacks],
  )

  const clearOpenedCards = useCallback(() => {
    setOpenedCards([])
    setOpenedPackId(null)
  }, [])

  return {
    cardSupply,
    standardCardSupply,
    boosterCardSupply,
    availableBoosterSupply,
    openedCards,
    openedPackId,
    isFetchingSupply,
    isBuyingPacks,
    isOpeningPack,
    getCardSupply,
    refreshCardSupply,
    buyPacks,
    openPack,
    clearOpenedCards,
  }
}
