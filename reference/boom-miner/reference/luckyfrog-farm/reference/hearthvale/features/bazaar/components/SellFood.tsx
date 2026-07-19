import React, { useContext, useState } from "react";
import { getImageSrc } from "lib/utils/getImageSrc";

import token from "assets/icons/token.gif";

import { Box } from "components/ui/Box";
import { OuterPanel, Panel } from "components/ui/Panel";
import { Button } from "components/ui/Button";

import { Craftable, Food, FOODS } from "features/game/types/craftables";
import { Modal } from "react-bootstrap";
import { ITEM_DETAILS } from "features/game/types/images";
import { ToastContext } from "features/game/toast/ToastQueueProvider";
import { useGameStore } from "features/game/store/useGameStore";
import Decimal from "decimal.js-light";

type FoodItem = Craftable & { name: Food };

export const SellFood: React.FC = () => {
  const foods = FOODS();
  const [selected, setSelected] = useState<FoodItem>(foods["Roasted Potato"] as FoodItem);
  const { setToast } = useContext(ToastContext);
  const [isSellAllModalOpen, showSellAllModal] = React.useState(false);
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);

  const inventory = state.inventory;

  const sell = (amount = 1) => {
    dispatch({
      type: "food.sell",
      item: selected.name,
      amount,
    });
    const sellPrice = selected.sellPrice || new Decimal(0);
    setToast({
      content: "VTC +$" + sellPrice.mul(amount).toString(),
    });
  };

  const foodCount = inventory[selected.name] || 0;
  const foodAmount = foodCount instanceof Decimal ? foodCount.toNumber() : foodCount;
  const noFood = foodAmount === 0;
  const displaySellPrice = selected.sellPrice || new Decimal(0);

  const handleSellOne = () => {
    sell(1);
  };

  const handleSellAll = () => {
    sell(foodAmount);
    showSellAllModal(false);
  };

  // ask confirmation if food supply is greater than 1
  const openConfirmationModal = () => {
    if (foodAmount === 1) {
      handleSellOne();
    } else {
      showSellAllModal(true);
    }
  };

  const closeConfirmationModal = () => {
    showSellAllModal(false);
  };

  return (
    <div className="flex">
      <div className="w-3/5 flex flex-wrap h-fit">
        {Object.values(foods).map((item) => (
          <Box
            isSelected={selected.name === item.name}
            key={item.name}
            onClick={() => setSelected(item as FoodItem)}
            image={ITEM_DETAILS[item.name].image}
            count={inventory[item.name]}
          />
        ))}
      </div>
      <OuterPanel className="flex-1 w-1/3">
        <div className="flex flex-col justify-center items-center p-2 ">
          <span className="text-shadow">{selected.name}</span>
          <img
            src={getImageSrc(ITEM_DETAILS[selected.name].image)}
            className="w-8 sm:w-12"
            alt={selected.name}
          />
          <span className="text-shadow text-center mt-2 sm:text-sm">
            {selected.description}
          </span>

          <div className="border-t border-white w-full mt-2 pt-1">
            <div className="flex justify-center items-end">
              <img src={typeof token === "string" ? token : token?.src} className="h-5 mr-1" />
              <span className="text-xs text-shadow text-center mt-2 ">
                {`$${displaySellPrice.toNumber()}`}
              </span>
            </div>
          </div>
          <Button
            disabled={foodAmount < 1}
            className="text-xs mt-1"
            onClick={() => handleSellOne()}
          >
            Sell 1
          </Button>
          <Button
            disabled={noFood}
            className="text-xs mt-1 whitespace-nowrap"
            onClick={() => openConfirmationModal()}
          >
            Sell All
          </Button>
        </div>
      </OuterPanel>
      <Modal centered show={isSellAllModalOpen} onHide={closeConfirmationModal}>
        <Panel className="md:w-4/5 m-auto">
          <div className="m-auto flex flex-col">
            <span className="text-sm text-center text-shadow">
              Are you sure you want to <br className="hidden md:block" />
              sell all your {selected.name}?
            </span>
            <span className="text-sm text-center text-shadow mt-1">
              Total: {foodAmount}
            </span>
          </div>
          <div className="flex justify-content-around p-1">
            <Button
              disabled={noFood}
              className="text-xs"
              onClick={() => handleSellAll()}
            >
              Yes
            </Button>
            <Button
              disabled={noFood}
              className="text-xs ml-2"
              onClick={closeConfirmationModal}
            >
              No
            </Button>
          </div>
        </Panel>
      </Modal>
    </div>
  );
};
