import React from "react";

import wood from "assets/resources/wood.png";
import close from "assets/icons/close.png";

import { Panel } from "components/ui/Panel";

import { WORKSHOP_RESOURCES } from "features/game/types/craftables";

import { CraftingItems } from "./CraftingItems";

interface Props {
  onClose: () => void;
}

export const Crafting: React.FC<Props> = ({ onClose }) => {
  return (
    <Panel className="pt-5 relative">
      <div className="flex justify-between absolute top-1.5 left-0.5 right-0 items-center">
        <div className="flex items-center pl-1">
          <img src={typeof wood === "string" ? wood : wood?.src} className="h-5 mr-2" />
          <span className="text-sm text-shadow">Craft</span>
        </div>
        <img
          src={typeof close === "string" ? close : close?.src}
          className="h-6 cursor-pointer mr-2 mb-1"
          onClick={onClose}
        />
      </div>

      <div style={{ minHeight: "200px" }}>
        <CraftingItems items={WORKSHOP_RESOURCES()} onClose={onClose} />
      </div>
    </Panel>
  );
};
