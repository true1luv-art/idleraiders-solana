import React, { useState, useEffect } from "react";
import Decimal from "decimal.js-light";

import close from "assets/icons/close.png";
import token from "assets/icons/token.gif";

import { Panel, InnerPanel } from "components/ui/Panel";
import { Tab } from "components/ui/Tab";
import { Button } from "components/ui/Button";
import { useGameStore } from "features/game/store/useGameStore";
import { useHiveBlockchain } from "lib/blockchain/useHiveBlockchain";
import { useHiveKeychain } from "lib/blockchain/useHiveKeychain";

type TabType = "deposit" | "withdraw";

interface WalletModalProps {
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>("deposit");
  const [amount, setAmount] = useState("");

  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  const username = state.username;

  const {
    loading: blockchainLoading,
    error: blockchainError,
    balances,
    fetchBalances,
    deposit,
    withdraw,
    clearError,
  } = useHiveBlockchain();

  const { isInstalled: keychainInstalled } = useHiveKeychain();

  // Fetch balances on mount if username exists
  useEffect(() => {
    if (username) {
      fetchBalances(username);
    }
  }, [username, fetchBalances]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only valid decimal numbers
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      clearError();
    }
  };

  const handleDeposit = async () => {
    if (!username || !amount) return;

    const depositAmount = new Decimal(amount);
    if (depositAmount.lte(0)) return;

    const success = await deposit(username, depositAmount);
    if (success) {
      // Update game balance
      dispatch({
        type: "wallet.deposit",
        amount: depositAmount,
      });
      setAmount("");
      // Refresh blockchain balances
      fetchBalances(username);
    }
  };

  const handleWithdraw = async () => {
    if (!username || !amount) return;

    const withdrawAmount = new Decimal(amount);
    if (withdrawAmount.lte(0)) return;

    // Check if player has enough coins
    if (withdrawAmount.gt(state.balance)) {
      return;
    }

    const success = await withdraw(username, withdrawAmount);
    if (success) {
      // Update game balance
      dispatch({
        type: "wallet.withdraw",
        amount: withdrawAmount,
      });
      setAmount("");
      // Refresh blockchain balances
      fetchBalances(username);
    }
  };

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    setAmount("");
    clearError();
  };

  return (
    <Panel className="pt-5 relative">
      {/* Header with tabs */}
      <div className="flex justify-between absolute top-1.5 left-0.5 right-0 items-center">
        <div className="flex">
          <Tab isActive={activeTab === "deposit"} onClick={() => handleTabClick("deposit")}>
            <span className="text-sm text-shadow">Deposit</span>
          </Tab>
          <Tab isActive={activeTab === "withdraw"} onClick={() => handleTabClick("withdraw")}>
            <span className="text-sm text-shadow">Withdraw</span>
          </Tab>
        </div>
        <img
          src={typeof close === "string" ? close : close?.src}
          className="h-6 cursor-pointer mr-2 mb-1"
          onClick={onClose}
          alt="close"
        />
      </div>

      {/* Balance Display */}
      <div className="flex gap-2 mb-3">
        <InnerPanel className="flex-1 p-2 text-center">
          <span className="text-xxs text-white/70 text-shadow block">COINS</span>
          <span className="text-lg font-bold text-white text-shadow">
            {new Decimal(state.balance).toDecimalPlaces(0, Decimal.ROUND_DOWN).toString()}
          </span>
        </InnerPanel>

        <InnerPanel className="flex-1 p-2 text-center">
          <span className="text-xxs text-white/70 text-shadow block">VTC BALANCE</span>
          <span className="text-lg font-bold text-white text-shadow">
            {balances.vtc.toDecimalPlaces(3, Decimal.ROUND_DOWN).toString()}
          </span>
        </InnerPanel>
      </div>

      {/* Action Panel */}
      <InnerPanel className="p-3">
        <div className="flex flex-col items-center">
          {activeTab === "deposit" && (
            <>
              <span className="text-shadow text-center mb-2">Deposit VTC</span>
              <img
                src={typeof token === "string" ? token : token?.src}
                className="w-10 img-highlight mb-3"
                alt="VTC"
              />

              <div className="w-full">
                <label className="text-xxs text-white/80 text-shadow block mb-1">
                  Amount (VTC)
                </label>
                <input
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0.000"
                  className="w-full bg-brown-200 text-white text-shadow outline-none text-xs p-2 rounded border-2 border-brown-600"
                  disabled={blockchainLoading}
                />

                {blockchainError && (
                  <p className="text-red-400 text-xxs mt-1">{blockchainError}</p>
                )}

                <Button
                  onClick={handleDeposit}
                  disabled={blockchainLoading || !amount || new Decimal(amount || 0).lte(0)}
                  className="w-full mt-2"
                >
                  {blockchainLoading ? "Processing..." : "Deposit"}
                </Button>

                <p className="text-xxs text-white/60 text-shadow mt-2 text-center">
                  VTC converts to coins 1:1
                </p>
              </div>
            </>
          )}

          {activeTab === "withdraw" && (
            <>
              <span className="text-shadow text-center mb-2">Withdraw to VTC</span>
              <img
                src={typeof token === "string" ? token : token?.src}
                className="w-10 img-highlight mb-3"
                alt="VTC"
              />

              <div className="w-full">
                <label className="text-xxs text-white/80 text-shadow block mb-1">
                  Amount (Coins)
                </label>
                <input
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0.000"
                  className="w-full bg-brown-200 text-white text-shadow outline-none text-xs p-2 rounded border-2 border-brown-600"
                  disabled={blockchainLoading}
                />

                {blockchainError && (
                  <p className="text-red-400 text-xxs mt-1">{blockchainError}</p>
                )}

                {amount && new Decimal(amount || 0).gt(state.balance) && (
                  <p className="text-red-400 text-xxs mt-1">Insufficient coins</p>
                )}

                <Button
                  onClick={handleWithdraw}
                  disabled={
                    blockchainLoading ||
                    !amount ||
                    new Decimal(amount || 0).lte(0) ||
                    new Decimal(amount || 0).gt(state.balance)
                  }
                  className="w-full mt-2"
                >
                  {blockchainLoading ? "Processing..." : "Withdraw"}
                </Button>

                <p className="text-xxs text-white/60 text-shadow mt-2 text-center">
                  Coins convert to VTC 1:1
                </p>
              </div>
            </>
          )}
        </div>
      </InnerPanel>

      {/* Keychain Status */}
      {!keychainInstalled && (
        <InnerPanel className="mt-2 p-2">
          <p className="text-xxs text-yellow-400 text-shadow text-center">
            Hive Keychain not detected. Install it for blockchain transactions.
          </p>
        </InnerPanel>
      )}

      {/* Info footer */}
      <InnerPanel className="mt-2 p-2">
        <p className="text-xxs text-white/80 text-shadow text-center">
          Funds settle through Hive accounts. Confirm transactions in Keychain.
        </p>
      </InnerPanel>
    </Panel>
  );
};
