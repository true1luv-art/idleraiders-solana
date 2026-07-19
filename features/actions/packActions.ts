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
  const { authPost, authGet, authPut } = useApiActions()
  const [cardSupply, setCardSupply] = useState<CardSupply>({})
  const [openedCards, setOpenedCards] = useState<RevealedCard[]>([])
  const [openedPackId, setOpenedPackId] = useState<string | null>(null)
  const [isFetchingSupply, setIsFetchingSupply] = useState(false)
  const [isBuyingPacks, setIsBuyingPacks] = useState(false)
  const [isOpeningPack, setIsOpeningPack] = useState(false)

  const getCardSupply = useCallback(async () => {
    try {
      const data = await authGet('/api/cards/supply')
      if (data?.supply) {
        setCardSupply(data.supply)
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

  const buyPacks = useCallback(
    async (packId: string, quantity: number, paymentMethod = 'coins') => {
      setIsBuyingPacks(true)
      try {
        const data = await authPost('/api/items/packs', { action: 'buy', packId, quantity, paymentMethod })

        // Success feedback is shown inside the BuyPackConfirm modal (green check
        // + auto-close). Only surface a toast when the purchase fails.
        if (data?.success === false) {
          toast.error(data.message || 'Failed to purchase packs')
        }

        return data
      } catch (error) {
        const err = error as Error
        toast.error(err.message || 'Failed to purchase packs')
        return { success: false, message: err.message }
      } finally {
        setIsBuyingPacks(false)
      }
    },
    [authPost],
  )

  const openPack = useCallback(
    async (packId: string, quantity: number = 1) => {
      setIsOpeningPack(true)
      try {
        const data = await authPut('/api/items/packs', { packId, quantity })

        if (data?.success === false) {
          toast.error(data.message || 'Failed to open pack')
          return data
        }

        setOpenedPackId(packId)
        setOpenedCards(Array.isArray(data?.cards) ? data.cards : [])
        return data
      } catch (error) {
        const err = error as Error
        toast.error(err.message || 'Failed to open pack')
        return { success: false, message: err.message }
      } finally {
        setIsOpeningPack(false)
      }
    },
    [authPut],
  )

  const clearOpenedCards = useCallback(() => {
    setOpenedCards([])
    setOpenedPackId(null)
  }, [])

  return {
    cardSupply,
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
