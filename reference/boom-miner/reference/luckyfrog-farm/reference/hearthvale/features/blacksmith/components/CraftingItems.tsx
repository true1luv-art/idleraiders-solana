import React, { useContext, useState } from "react";
import { getImageSrc } from "lib/utils/getImageSrc";
import classNames from "classnames";
import Decimal from "decimal.js-light";

import token from "assets/icons/token.gif";

import { Box } from "components/ui/Box";
import { OuterPanel } from "components/ui/Panel";
import { Button } from "components/ui/Button";
import { ToastContext } from "features/game/toast/ToastQueueProvider";
import { Context } from "features/game/GameProvider";
import { ITEM_DETAILS } from "features/game/types/images";
import { Craftable } from "features/game/types/craftables";
import { InventoryItemName } from "features/game/types/game";
import { useGameStore } from "features/game/store/useGameStore";

interface Props {
  items: Partial<Record<InventoryItemName, Craftable>>;
  isBulk?: boolean;
  onClose: () => void;
}

export const CraftingItems: React.FC<Props> = ({
  items,
  onClose,
  isBulk = false,
}) => {
  const [selected, setSelected] = useState<Craftable>(Object.values(items)[0]);
  const { setToast } = useContext(ToastContext);
  const { shortcutItem } = useContext(Context);
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);

  const inventory = state.inventory;

  const lessIngredients = (amount = 1) =>
    selected.ingredients.some(
      (ingredient) => ingredient.amount * amount > (inventory[ingredient.item] || 0)
    );
  const lessFunds = (amount = 1) =>
    new Decimal(state.balance).lessThan(selected.price.mul(amount));
  // Level requirement on craftables is no longer gated by player level — left as always-met
  const meetsLevelRequirement = true;

  const craft = (amount = 1) => {
    dispatch({
      type: "item.crafted",
      item: selected.name,
      amount,
    });
    setToast({ content: "VTC -$" + selected.price.mul(amount).toString() });
    selected.ingredients.map((ingredient, index) => {
      setToast({
        content: ingredient.item + " -" + ingredient.amount * amount,
      });
    });

    shortcutItem(selected.name);
  };

  const Action = () => {
    if (selected.disabled) {
      return <span className="text-xs mt-1 text-shadow">Locked</span>;
    }

    if (!meetsLevelRequirement) {
      return (
        <span className="text-xs mt-1 text-shadow text-red-400">
          Requires Level {selected.levelRequirement}
        </span>
      );
    }

    // Players can craft as long as they have enough VTC and ingredients.
    return (
      <>
        <Button
          disabled={lessFunds() || lessIngredients()}
          className="text-xs mt-1"
          onClick={() => craft()}
        >
          Craft {isBulk && "1"}
        </Button>
        {isBulk && (
          <Button
            disabled={lessFunds(10) || lessIngredients(10)}
            className="text-xs mt-1 whitespace-nowrap"
            onClick={() => craft(10)}
          >
            Craft 10
          </Button>
        )}
      </>
    );
  };

  return (
    <div className="flex">
      <div className="w-3/5 flex flex-wrap h-fit">
        {Object.values(items).map((item) => (
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
            className="h-16 img-highlight mt-1"
            alt={selected.name}
          />
          <span className="text-shadow text-center mt-2 sm:text-sm">
            {selected.description}
          </span>

          <div className="border-t border-white w-full mt-2 pt-1">
            {selected.ingredients.map((ingredient, index) => {
              const item = ITEM_DETAILS[ingredient.item];
              const lessIngredient =
                (inventory[ingredient.item] || 0) < ingredient.amount;

              return (
                <div className="flex justify-center items-end" key={index}>
                  <img src={getImageSrc(item.image)} className="h-5 me-2" />
                  <span
                    className={classNames(
                      "text-xs text-shadow text-center mt-2 ",
                      {
                        "text-red-500": lessIngredient,
                      }
                    )}
                  >
                    {ingredient.amount.toString()}
                  </span>
                </div>
              );
            })}

            <div className="flex justify-center items-end">
              <img src={typeof token === "string" ? token : token?.src} className="h-5 mr-1" />
              <span
                className={classNames("text-xs text-shadow text-center mt-2 ", {
                  "text-red-500": lessFunds(),
                })}
              >
                {`$${selected.price.toNumber()}`}
              </span>
            </div>
          </div>
          {Action()}
        </div>
      </OuterPanel>
    </div>
  );
};
