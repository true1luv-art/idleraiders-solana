import React, { useContext, useState } from "react";
import Modal from "react-bootstrap/Modal";

import basket from "assets/icons/basket.png";
import button from "assets/ui/button/round_button.png";

import { Label } from "components/ui/Label";
import { Box } from "components/ui/Box";

import { InventoryItems } from "./InventoryItems";
import { Context } from "features/game/GameProvider";

import { getShortcuts } from "../lib/shortcuts";
import { ITEM_DETAILS } from "features/game/types/images";
import { useGameStore } from "features/game/store/useGameStore";

export const Inventory: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { shortcutItem } = useContext(Context);
  const inventory = useGameStore((s) => s.state.inventory);

  const shortcuts = getShortcuts();

  const handleInventoryClick = () => {
    setIsOpen(true);
  };

  return (
    <div className="flex flex-col items-end mr-1 sm:mr-2 fixed top-2 right-0 z-50">
      <div
        className="w-10 h-10 sm:w-16 sm:h-16 sm:mx-8 mt-0 relative flex justify-center items-center shadow rounded-full cursor-pointer"
        onClick={() => handleInventoryClick()}
      >
        <img
          src={typeof button === "string" ? button : button?.src}
          className="absolute w-full h-full -z-10"
          alt="inventoryButton"
        />
        <img src={typeof basket === "string" ? basket : basket?.src} className="w-5 sm:w-8 mb-0.5 sm:mb-1" alt="inventory" />
        <Label className="hidden sm:block absolute -bottom-7">Items</Label>
      </div>

      <Modal centered scrollable show={isOpen} onHide={() => setIsOpen(false)}>
        <InventoryItems onClose={() => setIsOpen(false)} />
      </Modal>

      {/* In offline mode, we're always in "playing" state (never readonly) */}
      {(
        <div className="flex flex-col items-center sm:mt-8">
          {shortcuts.map((item, index) => (
            <Box
              key={index}
              isSelected={index === 0}
              image={ITEM_DETAILS[item]?.image}
              secondaryImage={ITEM_DETAILS[item]?.secondaryImage}
              count={inventory[item]}
              onClick={() => shortcutItem(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
