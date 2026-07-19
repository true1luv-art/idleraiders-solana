import React from "react";
import { Modal } from "react-bootstrap";
import classNames from "classnames";

import bank from "assets/buildings/tailor.gif";

import { Action } from "components/ui/Action";
import { GRID_WIDTH_PX } from "features/game/lib/constants";
import { WalletModal } from "features/hud/components/WalletModal";

import token from "assets/icons/token.gif";

export const Bank: React.FC = () => {
  const [isBankModalOpen, showBankModal] = React.useState(false);

  const handleClick = () => {
    showBankModal(true);
  };

  const closeBankModal = () => {
    showBankModal(false);
  };

  return (
    <div
      className="z-10 absolute"
      style={{
        width: `${GRID_WIDTH_PX * 4}px`,
        right: `${GRID_WIDTH_PX * 6}px`,
        top: `${GRID_WIDTH_PX * 0}px`,
      }}
    >
      <div
        className={classNames("cursor-pointer", "hover:img-highlight")}
      >
        <img
          src={typeof bank === "string" ? bank : bank?.src}
          alt="bank"
          onClick={handleClick}
          className="w-full"
        />
        <Action
          className="absolute bottom-10 left-0"
          text="Bank"
          icon={token}
          onClick={handleClick}
        />
      </div>
      <Modal centered show={isBankModalOpen} onHide={closeBankModal}>
        <WalletModal onClose={closeBankModal} />
      </Modal>
    </div>
  );
};
