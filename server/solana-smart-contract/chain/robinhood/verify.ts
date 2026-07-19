/**
 * server/solana-smart-contract/chain/robinhood/verify.ts
 *
 * Verifies a player → treasury ERC-20 Transfer on Robinhood Chain.
 * Reads the Transfer event from the tx receipt to confirm from / to / value.
 *
 * Pure chain operation: does NOT touch MongoDB.
 *
 * SERVER-ONLY.
 */

import { parseUnits, Contract } from 'ethers'
import { getProvider, ERC20_ABI, TOKEN_DECIMALS } from './rpc'
import { config } from '@/lib/config/config'
import type { DepositVerification } from '../solana/verify'

export async function verifyDepositFromPlayer(
  txHash: string,
  expectedPlayerWallet: string,
  expectedAmount: number,
): Promise<DepositVerification> {
  if (!txHash) {
    return { valid: false, code: 'INVALID', reason: 'Missing transaction hash' }
  }

  const provider  = getProvider()
  const treasury  = config.blockchain.treasuryAddress.toLowerCase()
  const token     = config.blockchain.robinhood.tokenAddress.toLowerCase()
  const rawAmount = parseUnits(String(expectedAmount), TOKEN_DECIMALS)

  let receipt
  try {
    receipt = await provider.getTransactionReceipt(txHash)
  } catch (err) {
    return { valid: false, code: 'NOT_CONFIRMED', reason: err instanceof Error ? err.message : String(err) }
  }

  if (!receipt) {
    return { valid: false, code: 'NOT_CONFIRMED', reason: 'Transaction receipt not found' }
  }

  if (receipt.status === 0) {
    return { valid: false, code: 'INVALID', reason: 'Transaction reverted on-chain' }
  }

  // Parse Transfer events from the receipt.
  const iface = new Contract(token, ERC20_ABI, provider).interface
  let transferFound = false

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== token) continue
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
      if (!parsed || parsed.name !== 'Transfer') continue

      const from  = String(parsed.args[0]).toLowerCase()
      const to    = String(parsed.args[1]).toLowerCase()
      const value = BigInt(parsed.args[2])

      if (from === expectedPlayerWallet.toLowerCase() && to === treasury && value === rawAmount) {
        transferFound = true
        break
      }
    } catch {
      continue
    }
  }

  if (!transferFound) {
    return { valid: false, code: 'INVALID', reason: 'No matching Transfer event found in receipt' }
  }

  return { valid: true }
}
