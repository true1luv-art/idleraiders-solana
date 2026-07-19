import React, { useState } from "react";

import food from "assets/crops/wheat/flour.png";
import egg from "assets/resources/egg.png";
import close from "assets/icons/close.png";

import { Panel } from "components/ui/Panel";
import { Tab } from "components/ui/Tab";

import { SellFood } from "./SellFood";
import { SellProduce } from "./SellProduce";

interface Props {
  onClose: () => void;
}

type TabName = "food" | "produce";

export const BazaarItems: React.FC<Props> = ({ onClose }) => {
  const [tab, setTab] = useState<TabName>("food");

  return (
    <Panel className="pt-5 relative">
      <div className="flex justify-between absolute top-1.5 left-0.5 right-0 items-center">
        <div className="flex">
          <Tab isActive={tab === "food"} onClick={() => setTab("food")}>
            <img src={typeof food === "string" ? food : food?.src} className="h-5 mr-2" />
            <span className="text-sm text-shadow">Food</span>
          </Tab>
          <Tab isActive={tab === "produce"} onClick={() => setTab("produce")}>
            <img src={typeof egg === "string" ? egg : egg?.src} className="h-5 mr-2" />
            <span className="text-sm text-shadow">Produce</span>
          </Tab>
        </div>
        <img
          src={typeof close === "string" ? close : close?.src}
          className="h-6 cursor-pointer mr-2 mb-1"
          onClick={() => onClose()}
        />
      </div>

      {tab === "food" && <SellFood />}
      {tab === "produce" && <SellProduce />}
    </Panel>
  );
};
