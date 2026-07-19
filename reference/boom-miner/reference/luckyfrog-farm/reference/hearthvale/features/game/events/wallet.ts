import Decimal from "decimal.js-light";
import { GameState } from "../types/game";

/**
 * Wallet Deposit Action
 * Converts VTC from Hive Engine to in-game coins.
 * Rate: 1 VTC = 1 Coin
 */
export type WalletDepositAction = {
  type: "wallet.deposit";
  amount: Decimal;
};

/**
 * Wallet Withdraw Action
 * Converts in-game coins to VTC on Hive Engine.
 * Rate: 1 Coin = 1 VTC
 */
export type WalletWithdrawAction = {
  type: "wallet.withdraw";
  amount: Decimal;
};

export type WalletAction = WalletDepositAction | WalletWithdrawAction;

/**
 * Process a deposit from VTC to coins.
 * This should be called after blockchain confirmation.
 */
export function walletDeposit({
  state,
  action,
}: {
  state: GameState;
  action: WalletDepositAction;
}): GameState {
  const depositAmount = new Decimal(action.amount);

  if (depositAmount.lte(0)) {
    throw new Error("Deposit amount must be greater than 0");
  }

  return {
    ...state,
    balance: new Decimal(state.balance).add(depositAmount),
  };
}

/**
 * Process a withdrawal from coins to VTC.
 * This should be called before initiating the blockchain transfer.
 */
export function walletWithdraw({
  state,
  action,
}: {
  state: GameState;
  action: WalletWithdrawAction;
}): GameState {
  const withdrawAmount = new Decimal(action.amount);

  if (withdrawAmount.lte(0)) {
    throw new Error("Withdrawal amount must be greater than 0");
  }

  const currentBalance = new Decimal(state.balance);

  if (withdrawAmount.gt(currentBalance)) {
    throw new Error("Insufficient coins for withdrawal");
  }

  return {
    ...state,
    balance: currentBalance.sub(withdrawAmount),
  };
}
