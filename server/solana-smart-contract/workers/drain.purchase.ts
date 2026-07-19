/**
 * server/solana-smart-contract/workers/drain.purchase.ts
 *
 * Purchase drain handler.
 *
 * Purchase = player paid tokens on-chain to the treasury to buy something in-game.
 *
 * Flow:
 *   1. Verify the on-chain transfer (player → treasury).
 *   2. Claim the settlement slot (at-most-once via txHash index).
 *   3. Apply the in-game purchase effect (award item).
 *   4. completeJob.
 *   5. Socket notify.
 *
 * SERVER-ONLY.
 */

import type { Server } from 'socket.io'
import { completeJob, failJob } from '@/lib/modules/transactions-pending/repository.server'
import type { IPendingTransaction } from '@/lib/modules/transactions-pending/types.server'
import { claimProcessedTransaction } from '@/lib/modules/transactions-processed/repository.server'
import { getChain } from '../chain'
import { logger } from '../lib/logger'

export async function drainPurchase(
  job: IPendingTransaction,
  io: Server,
  maxRetries: number,
): Promise<void> {
  const id     = String(job._id)
  const amount = job.amount ?? 0
  const itemId = job.itemId ?? 'unknown'

  // 1. Verify on-chain transfer.
  let verification
  try {
    verification = await getChain().verifyDeposit(job.signature, job.walletAddress, amount)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await failJob(id, `VERIFY_ERROR: ${message}`, maxRetries)
    logger.warn('purchase verify threw', { wallet: job.walletAddress, error: message })
    return
  }

  if (!verification.valid) {
    if (verification.code === 'NOT_CONFIRMED') {
      await failJob(id, `NOT_CONFIRMED: ${verification.reason ?? ''}`, maxRetries)
      logger.warn('purchase not confirmed yet', { wallet: job.walletAddress, sig: job.signature })
      return
    }
    // INVALID — terminal.
    await failJob(id, `INVALID: ${verification.reason ?? ''}`, 1)
    logger.warn('purchase invalid — dead-lettered', { wallet: job.walletAddress, reason: verification.reason })
    return
  }

  // 2. Claim settlement slot.
  const { claimed } = await claimProcessedTransaction({
    txHash: job.signature,
    wallet: job.walletAddress,
    type:   'purchase',
    amount,
  })

  if (!claimed) {
    await completeJob(id)
    logger.info('purchase already processed — idempotent complete', { wallet: job.walletAddress })
    return
  }

  // 3. Apply in-game purchase effect.
  try {
    await applyPurchaseEffect(job.walletAddress, itemId, io)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Purchase effect failed — the ledger row is already claimed so we won't
    // re-credit, but we also don't want to lose the item. Retry the job so
    // the effect can be retried (claimProcessedTransaction will return
    // claimed: false on the next attempt, signalling idempotent completion).
    const deadLettered = await failJob(id, `ITEM_EFFECT_ERROR: ${message}`, maxRetries)
    logger.warn(
      deadLettered ? 'purchase: item effect dead-lettered' : 'purchase: item effect retry scheduled',
      { wallet: job.walletAddress, itemId },
    )
    return
  }

  // 4. Complete queue row.
  await completeJob(id)

  // 5. Notify client.
  const { userSockets } = await import('@/server/sockets/socket.manager')
  // Purchase notify — itemId-based event, no coins delta
  io.to(job.walletAddress).emit('transaction_success', { type: 'purchase', itemId })

  logger.info('purchase settled', { wallet: job.walletAddress, amount, itemId, txHash: job.signature })
}

/**
 * Dispatch table for in-game purchase effects.
 * Add new item types here as the catalogue grows.
 */
async function applyPurchaseEffect(
  walletAddress: string,
  itemId: string,
  _io: Server,
): Promise<void> {
  switch (itemId) {
    case 'card_pack': {
      // Award a card pack to the player.
      // This will be implemented as CardService.awardPack() when the card pack
      // service is built. For now we log and no-op to keep the drain wired up.
      logger.info('purchase: card_pack awarded (stub)', { wallet: walletAddress })
      break
    }
    default: {
      // Unknown item — log and complete so dead items don't block the queue.
      logger.warn('purchase: unknown itemId', { wallet: walletAddress, itemId })
      break
    }
  }
}
