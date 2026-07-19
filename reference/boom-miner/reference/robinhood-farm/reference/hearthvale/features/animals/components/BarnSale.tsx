import React, { useState } from "react";

import close from "assets/icons/close.png";
import chicken from "assets/animals/chicken.png";

import { Panel } from "components/ui/Panel";
import { Tab } from "components/ui/Tab";
import { ANIMALS } from "features/game/types/craftables";
import { CraftingItems } from "features/blacksmith/components/CraftingItems";

interface Props {
  onClose: () => void;
}

export const BarnSale: React.FC<Props> = ({ onClose }) => {
  const [tab] = useState<"animals">("animals");

  return (
    <Panel className="pt-5 relative">
      <div className="flex justify-between absolute top-1.5 left-0.5 right-0 items-center">
        <div className="flex">
          <Tab isActive={tab === "animals"} onClick={() => { }}>
            <img src={typeof chicken === "string" ? chicken : chicken?.src} className="h-5 mr-2" />
            <span className="text-sm text-shadow">Animals</span>
          </Tab>
          {/* Rare tab removed - no blockchain minting in offline mode */}
        </div>
        <img
          src={typeof close === "string" ? close : close?.src}
          className="h-6 cursor-pointer mr-2 mb-1"
          onClick={onClose}
        />
      </div>

      <div
        style={{
          minHeight: "200px",
        }}
      >
        {tab === "animals" && (
          <CraftingItems items={ANIMALS} onClose={onClose} />
        )}
      </div>
    </Panel>
  );
};
