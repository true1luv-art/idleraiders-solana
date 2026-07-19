/**
 * Blockchain Integration Module
 * 
 * This module provides hooks for Hive blockchain integration.
 * VTC is the test token on Hive Engine used for deposits/withdrawals.
 * In-game currency uses "coins" which are 1:1 with VTC.
 */

export { useHiveBlockchain } from "./useHiveBlockchain";
export type { HiveBalances, UseHiveBlockchainReturn } from "./useHiveBlockchain";

export { useHiveKeychain } from "./useHiveKeychain";
export type { KeychainResponse, UseHiveKeychainReturn } from "./useHiveKeychain";
