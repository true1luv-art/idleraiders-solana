/**
 * server/solana-smart-contract/chain/solana/verify.ts
 *
 * Verifies a player → treasury SPL-token transfer signed IN THE BROWSER.
 * The server does NOT sign anything — it reads the confirmed transaction back
 * from chain and asserts the correct amount of the correct mint moved from the
 * player to the treasury.
 *
 * Pure chain operation: does NOT touch MongoDB.
 *
 * SERVER-ONLY.
 */

import { config } from '@/lib/config/config'
import { getConnection, getMintDecimals } from './rpc'

const solana = config.blockchain.solana

export interface DepositVerification {
  valid: boolean
  reason?: string
  /**
   * - "NOT_CONFIRMED": tx isn't confirmed yet. Retryable.
   * - "INVALID": tx is confirmed but payment rules are not met. Terminal.
   */
  code?: 'NOT_CONFIRMED' | 'INVALID'
}

export interface VerifyDepositOptions {
  maxTries?: number
  delayMs?: number
}

function toBaseUnits(amount: number, decimals: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid amount: ${amount}`)
  }
  const [whole, frac = ''] = String(amount).split('.')
  const paddedFrac = (frac + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole + paddedFrac)
}

function sumOwnerBalance(
  balances: Array<{ mint: string; owner?: string; uiTokenAmount: { amount: string } }> | null | undefined,
  owner: string,
  mint: string,
): bigint {
  if (!balances) return 0n
  let total = 0n
  for (const b of balances) {
    if (b.mint === mint && b.owner === owner) {
      total += BigInt(b.uiTokenAmount.amount)
    }
  }
  return total
}

/**
 * Verifies that `signature` is a confirmed Solana transaction where:
 *   - the player (expectedPlayerWallet) signed, AND
 *   - the treasury received exactly `expectedAmount` whole tokens.
 *
 * The treasury token balance delta is checked directly (post - pre), making
 * this robust to ATA-creation side effects and memo instructions.
 */
export async function verifyDepositFromPlayer(
  signature: string,
  expectedPlayerWallet: string,
  expectedAmount: number,
  opts: VerifyDepositOptions = {},
): Promise<DepositVerification> {
  if (!signature || typeof signature !== 'string') {
    return { valid: false, code: 'INVALID', reason: 'Missing transaction signature' }
  }
  if (!solana.mint) {
    return { valid: false, code: 'INVALID', reason: 'Server mint address is not configured' }
  }

  const connection = getConnection()
  const mint       = solana.mint
  const treasury   = config.blockchain.treasuryAddress

  const decimals    = await getMintDecimals()
  const expectedRaw = toBaseUnits(expectedAmount, decimals)

  const MAX_TRIES = opts.maxTries ?? 12
  const DELAY_MS  = opts.delayMs  ?? 2000

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    let tx
    try {
      tx = await connection.getParsedTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      })
    } catch (err) {
      return {
        valid:  false,
        code:   'NOT_CONFIRMED',
        reason: err instanceof Error ? err.message : String(err),
      }
    }

    if (!tx) {
      if (attempt < MAX_TRIES - 1) {
        await new Promise((r) => setTimeout(r, DELAY_MS))
        continue
      }
      return { valid: false, code: 'NOT_CONFIRMED', reason: 'Transaction not found or not yet confirmed' }
    }

    if (tx.meta?.err) {
      return { valid: false, code: 'INVALID', reason: 'Transaction failed on-chain' }
    }

    const signedByPlayer = tx.transaction.message.accountKeys.some(
      (k) => k.signer && String(k.pubkey) === expectedPlayerWallet,
    )
    if (!signedByPlayer) {
      return { valid: false, code: 'INVALID', reason: 'Transaction was not signed by the authenticated wallet' }
    }

    const treasuryPre   = sumOwnerBalance(tx.meta?.preTokenBalances, treasury, mint)
    const treasuryPost  = sumOwnerBalance(tx.meta?.postTokenBalances, treasury, mint)
    const treasuryDelta = treasuryPost - treasuryPre

    if (treasuryDelta !== expectedRaw) {
      return {
        valid:  false,
        code:   'INVALID',
        reason: `Treasury received ${treasuryDelta} base units, expected ${expectedRaw}`,
      }
    }

    const playerPre  = sumOwnerBalance(tx.meta?.preTokenBalances, expectedPlayerWallet, mint)
    const playerPost = sumOwnerBalance(tx.meta?.postTokenBalances, expectedPlayerWallet, mint)
    if (playerPre - playerPost < expectedRaw) {
      return { valid: false, code: 'INVALID', reason: 'Sender balance did not decrease by the expected amount' }
    }

    return { valid: true }
  }

  return { valid: false, code: 'NOT_CONFIRMED', reason: 'Transaction not found or not yet confirmed' }
}
