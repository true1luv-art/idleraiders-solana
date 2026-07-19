import React, { useContext, useState } from "react";
import { getImageSrc } from "lib/utils/getImageSrc";

import token from "assets/icons/token.gif";

import { Box } from "components/ui/Box";
import { OuterPanel, Panel } from "components/ui/Panel";
import { Button } from "components/ui/Button";

import { Modal } from "react-bootstrap";
import { ITEM_DETAILS } from "features/game/types/images";
import { RESOURCES } from "features/game/types/resources";
import { ToastContext } from "features/game/toast/ToastQueueProvider";
import { useGameStore } from "features/game/store/useGameStore";
import Decimal from "decimal.js-light";
import { ProduceName } from "features/game/events/sellProduce";

const PRODUCE_ITEMS: ProduceName[] = ["Egg", "Milk", "Wool"];

export const SellProduce: React.FC = () => {
  const [selected, setSelected] = useState<ProduceName>("Egg");
  const { setToast } = useContext(ToastContext);
  const [isSellAllModalOpen, showSellAllModal] = useState(false);
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);

  const inventory = state.inventory;

  const sell = (amount: number) => {
    dispatch({
      type: "produce.sell",
      item: selected,
      amount,
    });
    const sellPrice = RESOURCES[selected].sellPrice ?? 0;
    setToast({
      content: "VTC +$" + new Decimal(sellPrice).mul(amount).toFixed(2),
    });
  };

  const rawCount = inventory[selected] || new Decimal(0);
  const produceAmount = rawCount instanceof Decimal ? rawCount.toNumber() : Number(rawCount);
  const noStock = produceAmount === 0;
  const selectedResource = RESOURCES[selected];
  const displaySellPrice = new Decimal(selectedResource.sellPrice ?? 0);

  const handleSellOne = () => sell(1);

  const handleSellAll = () => {
    sell(produceAmount);
    showSellAllModal(false);
  };

  const openConfirmationModal = () => {
    if (produceAmount === 1) {
      handleSellOne();
    } else {
      showSellAllModal(true);
    }
  };

  return (
    <div className="flex">
      <div className="w-3/5 flex flex-wrap h-fit">
        {PRODUCE_ITEMS.map((name) => (
          <Box
            isSelected={selected === name}
            key={name}
            onClick={() => setSelected(name)}
            image={ITEM_DETAILS[name].image}
            count={inventory[name]}
          />
        ))}
      </div>
      <OuterPanel className="flex-1 w-1/3">
        <div className="flex flex-col justify-center items-center p-2">
          <span className="text-shadow">{selected}</span>
          <img
            src={getImageSrc(ITEM_DETAILS[selected].image)}
            className="w-8 sm:w-12"
            alt={selected}
          />
          <span className="text-shadow text-center mt-2 sm:text-sm">
            {selectedResource.description}
          </span>

          <div className="border-t border-white w-full mt-2 pt-1">
            <div className="flex justify-center items-end">
              <img src={typeof token === "string" ? token : token?.src} className="h-5 mr-1" />
              <span className="text-xs text-shadow text-center mt-2">
                {`$${displaySellPrice.toFixed(2)}`}
              </span>
            </div>
          </div>
          <Button
            disabled={produceAmount < 1}
            className="text-xs mt-1"
            onClick={handleSellOne}
          >
            Sell 1
          </Button>
          <Button
            disabled={noStock}
            className="text-xs mt-1 whitespace-nowrap"
            onClick={openConfirmationModal}
          >
            Sell All
          </Button>
        </div>
      </OuterPanel>

      <Modal centered show={isSellAllModalOpen} onHide={() => showSellAllModal(false)}>
        <Panel className="md:w-4/5 m-auto">
          <div className="m-auto flex flex-col">
            <span className="text-sm text-center text-shadow">
              Are you sure you want to <br className="hidden md:block" />
              sell all your {selected}?
            </span>
            <span className="text-sm text-center text-shadow mt-1">
              Total: {produceAmount}
            </span>
          </div>
          <div className="flex justify-content-around p-1">
            <Button
              disabled={noStock}
              className="text-xs"
              onClick={handleSellAll}
            >
              Yes
            </Button>
            <Button
              className="text-xs ml-2"
              onClick={() => showSellAllModal(false)}
            >
              No
            </Button>
          </div>
        </Panel>
      </Modal>
    </div>
  );
};
