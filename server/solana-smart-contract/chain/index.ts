/**
 * server/solana-smart-contract/chain/index.ts
 *
 * Chain dispatcher — routes to the correct chain adapter based on
 * `NEXT_PUBLIC_CHAIN` (solana | hive | robinhood). Defaults to solana.
 *
 * All drain workers call getChain() so switching chains only requires an
 * env-var change and a restart.
 *
 * SERVER-ONLY.
 */

import { config } from '@/lib/config/config'
import type { DepositVerification } from './solana/verify'

export interface ChainAdapter {
  /** Treasury → player payout (withdrawal). */
  sendWithdrawal(playerAddress: string, amount: number, ref: string): Promise<{ txHash: string }>
  /** Verify a player → treasury on-chain transfer (deposit / purchase). */
  verifyDeposit(txId: string, playerAddress: string, expectedAmount: number): Promise<DepositVerification>
}

export function getChain(): ChainAdapter {
  const chain = config.blockchain.chain

  if (chain === 'hive') {
    const { sendWithdrawal, verifyDeposit } = require('./hive/adapter') as ChainAdapter
    return { sendWithdrawal, verifyDeposit }
  }

  if (chain === 'robinhood') {
    const { sendWithdrawal } = require('./robinhood/transfer') as { sendWithdrawal: ChainAdapter['sendWithdrawal'] }
    const { verifyDepositFromPlayer } = require('./robinhood/verify') as { verifyDepositFromPlayer: (txId: string, playerAddress: string, expectedAmount: number) => Promise<DepositVerification> }
    return {
      sendWithdrawal,
      verifyDeposit: verifyDepositFromPlayer,
    }
  }

  // Default: solana
  const { sendWithdrawal } = require('./solana/transfer') as { sendWithdrawal: ChainAdapter['sendWithdrawal'] }
  const { verifyDepositFromPlayer } = require('./solana/verify') as { verifyDepositFromPlayer: (txId: string, playerAddress: string, expectedAmount: number) => Promise<DepositVerification> }
  return {
    sendWithdrawal,
    verifyDeposit: verifyDepositFromPlayer,
  }
}
