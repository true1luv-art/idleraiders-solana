import React, { useContext, useState, useEffect } from "react";
import { getImageSrc } from "lib/utils/getImageSrc";
import classNames from "classnames";

import token from "assets/icons/token.gif";
import timer from "assets/icons/timer.png";
import lightning from "assets/icons/lightning.png";
import lock from "assets/skills/lock.png";

import { Box } from "components/ui/Box";
import { OuterPanel } from "components/ui/Panel";
import { Button } from "components/ui/Button";

import { secondsToMidString } from "lib/utils/time";

import { Context } from "features/game/GameProvider";
import { Craftable } from "features/game/types/craftables";
import { CropName, CROPS, SEEDS } from "features/game/types/crops";
import { ITEM_DETAILS } from "features/game/types/images";
import { ToastContext } from "features/game/toast/ToastQueueProvider";
import { Decimal } from "decimal.js-light";
import { getBuyPrice } from "features/game/events/craft";
import { getCropTime } from "features/game/events/plant";
import { useGameStore } from "features/game/store/useGameStore";
import { getSkillLevel } from "features/game/lib/skills";

interface Props {
  onClose: () => void;
}

export const Seeds: React.FC<Props> = ({ onClose }) => {
  const [selected, setSelected] = useState<Craftable>(
    SEEDS()["Potato Seed"]
  );
  const { setToast } = useContext(ToastContext);
  const { shortcutItem } = useContext(Context);
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  const farmingLevel = getSkillLevel(state.skills?.farming ?? 0);

  const inventory = state.inventory;

  const price = getBuyPrice(selected, inventory);
  const buy = (amount = 1) => {
    dispatch({
      type: "item.crafted",
      item: selected.name,
      amount,
    });
    setToast({ content: "VTC -$" + price.mul(amount).toString() });
    shortcutItem(selected.name);
  };

  const handlBuyOne = () => {
    buy();
  };

  const handleBuyTen = () => {
    buy(10);
  };

  // `balance` is currency (Decimal); price is also Decimal — keep Decimal math here.
  const lessFunds = (amount = 1) =>
    new Decimal(state.balance).lessThan(price.mul(amount).toString());

  const cropName = selected.name.split(" ")[0] as CropName;
  const crop = CROPS()[cropName];

  const Action = () => {
    // Level gate: seeds require a minimum farming skill level
    const levelRequirement = selected.levelRequirement ?? 0;
    const isLevelLocked = farmingLevel < levelRequirement;
    
    if (isLevelLocked) {
      return (
        <div className="flex flex-col items-center mt-1">
          <img src={typeof lock === "string" ? lock : lock?.src} className="h-6 mb-1" alt="locked" />
          <span className="text-xs text-shadow text-center">Requires Level {levelRequirement}</span>
        </div>
      );
    }

    if (selected.disabled) {
      return <span className="text-xs mt-1 text-shadow">Locked</span>;
    }

    // Players can buy as long as they have enough VTC.
    return (
      <>
        <Button
          disabled={lessFunds()}
          className="text-xs mt-1"
          onClick={() => handlBuyOne()}
        >
          Buy 1
        </Button>
        <Button
          disabled={lessFunds(10)}
          className="text-xs mt-1"
          onClick={() => buy(10)}
        >
          Buy 10
        </Button>
      </>
    );
  };

  return (
    <div className="flex">
      <div className="w-3/5 flex flex-wrap h-fit">
        {Object.values(SEEDS()).map((item: Craftable) => (
          <Box
            isSelected={selected.name === item.name}
            key={item.name}
            onClick={() => setSelected(item)}
            image={ITEM_DETAILS[item.name].image}
            count={inventory[item.name]}
          />
        ))}
      </div>
      <OuterPanel className="flex-1 w-1/3">
        <div className="flex flex-col justify-center items-center p-2 relative">
          <span className="text-shadow text-center">{selected.name}</span>
          <img
            src={getImageSrc(ITEM_DETAILS[selected.name].image)}
            className="w-8 sm:w-12 img-highlight mt-1"
            alt={selected.name}
          />
          <div className="border-t border-white w-full mt-2 pt-1">
            <div className="flex justify-center items-center">
              <img src={typeof timer === "string" ? timer : timer?.src} className="h-5 me-2" />

              <span className="text-xs text-shadow text-center mt-2">
                {secondsToMidString(getCropTime(crop.name, inventory))}
              </span>
            </div>
            <div className="flex justify-center items-end">
              <img src={typeof token === "string" ? token : token?.src} className="h-5 mr-1" />
              <span
                className={classNames("text-xs text-shadow text-center mt-2", {
                  "text-red-500": lessFunds(),
                })}
              >
                {`$${price.toString()}`}
              </span>
            </div>
          </div>
          {Action()}
        </div>
      </OuterPanel>
    </div>
  );
};
