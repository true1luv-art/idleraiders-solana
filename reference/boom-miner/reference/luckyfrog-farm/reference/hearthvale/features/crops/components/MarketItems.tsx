import React, { useState } from "react";

import seeds from "assets/icons/seeds.png";
import potatoCrop from "assets/crops/potato/crop.png";
import close from "assets/icons/close.png";

import { Panel } from "components/ui/Panel";
import { Tab } from "components/ui/Tab";

import { Seeds } from "./Seeds";
import { Plants } from "./Plants";

interface Props {
  onClose: () => void;
}

export const MarketItems: React.FC<Props> = ({ onClose }) => {
  const [tab, setTab] = useState<"buy" | "sell">("buy");

  const handleTabClick = (tab: "buy" | "sell") => {
    setTab(tab);
  };

  return (
    <Panel className="pt-5 relative">
      <div className="flex justify-between absolute top-1.5 left-0.5 right-0 items-center">
        <div className="flex">
          <Tab isActive={tab === "buy"} onClick={() => handleTabClick("buy")}>
            <img src={typeof seeds === "string" ? seeds : seeds?.src} className="h-5 mr-2" />
            <span className="text-sm text-shadow">Buy</span>
          </Tab>
          <Tab isActive={tab === "sell"} onClick={() => handleTabClick("sell")}>
            <img src={typeof potatoCrop === "string" ? potatoCrop : potatoCrop?.src} className="h-5 mr-2" />
            <span className="text-sm text-shadow">Sell</span>
          </Tab>
          {/* Rare tab removed - no blockchain minting in offline mode */}
        </div>
        <img
          src={typeof close === "string" ? close : close?.src}
          className="h-6 cursor-pointer mr-2 mb-1"
          onClick={() => onClose()}
        />
      </div>

      {tab === "buy" && <Seeds onClose={onClose} />}
      {tab === "sell" && <Plants />}
    </Panel>
  );
};
