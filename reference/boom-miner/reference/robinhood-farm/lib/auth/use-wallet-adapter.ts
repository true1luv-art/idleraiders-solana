'use client';

import { useState, useEffect, useCallback } from 'react';

export const SIGN_MESSAGE =
  'Sign this message to authenticate with Robinhood Farm. This is free — no transaction is sent.';

export type WalletType = 'phantom' | 'metamask' | 'rabby' | 'coinbase' | 'brave' | 'okx' | 'unknown';

// ---------------------------------------------------------------------------
// Robinhood Chain — hard-coded mainnet values from the official chain docs.
// Chain ID 4663 (0x1237 hex), native currency ETH.
// ---------------------------------------------------------------------------
export const ROBINHOOD_CHAIN_ID_HEX = '0x1237'; // 4663 decimal
export const ROBINHOOD_CHAIN_ID_DEC = 4663;
export const ROBINHOOD_CHAIN_NAME   = 'Robinhood Chain';
export const ROBINHOOD_RPC_URL      = 'https://rpc.mainnet.chain.robinhood.com/';
export const ROBINHOOD_EXPLORER_URL = 'https://robinhoodchain.blockscout.com';

/**
 * Thrown when the wallet's active chain is not Robinhood Chain (4663).
 * The login page catches this class specifically to show the manual-add UI
 * instead of a generic red error.
 */
export class WrongChainError extends Error {
  readonly isWrongChain = true;
  constructor() {
    super('wrong-chain');
    this.name = 'WrongChainError';
  }
}

/**
 * Checks that the wallet's active network is Robinhood Chain.
 * Does NOT auto-switch or auto-add — throws WrongChainError so the UI
 * can show clear instructions for adding the network manually.
 */
async function assertRobinhoodChain(
  provider: EIP6963Provider['provider'],
): Promise<void> {
  const chainId = (await provider.request({ method: 'eth_chainId' })) as string;
  // Normalise both sides to lowercase hex with leading 0x for safe comparison.
  const normalise = (c: string) =>
    '0x' + parseInt(c, 16).toString(16);
  if (normalise(chainId) !== normalise(ROBINHOOD_CHAIN_ID_HEX)) {
    throw new WrongChainError();
  }
}

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963Provider {
  info: EIP6963ProviderInfo;
  provider: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
}

export interface ConnectResult {
  wallet: string;
  walletType: WalletType;
  signature: string;
  message: string;
}

function rdnsToWalletType(rdns: string, name: string): WalletType {
  const r = rdns.toLowerCase();
  const n = name.toLowerCase();
  if (r.includes('phantom')) return 'phantom';
  if (r.includes('metamask') || n.includes('metamask')) return 'metamask';
  if (r.includes('rabby') || n.includes('rabby')) return 'rabby';
  if (r.includes('coinbase') || n.includes('coinbase')) return 'coinbase';
  if (r.includes('brave') || n.includes('brave')) return 'brave';
  if (r.includes('okx') || n.includes('okx')) return 'okx';
  return 'unknown';
}

/**
 * Discovers EIP-6963 injected wallets and provides connect + sign helpers.
 */
export function useEIP6963Wallets() {
  const [wallets, setWallets] = useState<EIP6963Provider[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Deduplicate by rdns — some wallets announce multiple providers with
    // different uuids but the same rdns. Only keep the first announcement per rdns.
    const seen = new Set<string>();

    function handleAnnounce(event: Event) {
      const e = event as CustomEvent<EIP6963Provider>;
      if (!e.detail?.info?.rdns) return;
      if (seen.has(e.detail.info.rdns)) return;
      seen.add(e.detail.info.rdns);
      setWallets((prev) => [...prev, e.detail]);
    }

    window.addEventListener('eip6963:announceProvider', handleAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnounce);
    };
  }, []);

  const connectAndSign = useCallback(
    async (selected: EIP6963Provider): Promise<ConnectResult> => {
      const { provider, info } = selected;

      // Request accounts
      const accounts = (await provider.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet.');
      }

      const address = accounts[0];
      const message = SIGN_MESSAGE;

      // Gate: wallet must already be on Robinhood Chain. No auto-switch.
      await assertRobinhoodChain(provider);

      // personal_sign: params are [message_hex, address]
      const msgHex =
        '0x' + Buffer.from(message, 'utf8').toString('hex');

      const signature = (await provider.request({
        method: 'personal_sign',
        params: [msgHex, address],
      })) as string;

      return {
        wallet: address.toLowerCase(),
        walletType: rdnsToWalletType(info.rdns, info.name),
        signature,
        message,
      };
    },
    [],
  );

  return { wallets, connectAndSign };
}
