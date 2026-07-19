import React, { useContext, useState, useEffect } from "react";
import { getImageSrc } from "lib/utils/getImageSrc";
import classNames from "classnames";
import Decimal from "decimal.js-light";

import { Box } from "components/ui/Box";
import { OuterPanel } from "components/ui/Panel";
import { Button } from "components/ui/Button";
import { ToastContext } from "features/game/toast/ToastQueueProvider";
import { Context } from "features/game/GameProvider";
import { ITEM_DETAILS } from "features/game/types/images";
import { Craftable, Food } from "features/game/types/craftables";
import { InventoryItemName } from "features/game/types/game";
import { useGameStore } from "features/game/store/useGameStore";

interface Props {
  items: Partial<Record<InventoryItemName, Craftable>>;
}

/** Format seconds as "Xm Ys" or "Xs". */
function formatTime(seconds: number): string {
  if (seconds <= 0) return "Ready";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const CraftingItems: React.FC<Props> = ({ items }) => {
  const [selected, setSelected] = useState<Craftable>(Object.values(items)[0]);
  const [now, setNow]           = useState<number>(Date.now());

  const { setToast }    = useContext(ToastContext);
  const { shortcutItem } = useContext(Context);
  const state    = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);

  const inventory = state.inventory;
  const cooking   = state.cooking;

  // Tick every second so the countdown stays live
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // --- derived state ---
  const isCooking        = cooking !== null;
  const isThisCooking    = isCooking && cooking!.item === selected.name;
  const isOtherCooking   = isCooking && cooking!.item !== selected.name;

  const elapsedMs        = isCooking ? now - cooking!.startedAt : 0;
  const durationMs       = isCooking ? cooking!.duration * 1000 : 0;
  const remainingSec     = isCooking
    ? Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000))
    : 0;
  const isReady          = isThisCooking && remainingSec === 0;
  const progressPct      = isThisCooking
    ? Math.min(100, (elapsedMs / durationMs) * 100)
    : 0;

  const lessIngredients = () =>
    selected.ingredients.some((ingredient) => {
      const need = ingredient.amount instanceof Decimal
        ? ingredient.amount.toNumber()
        : Number(ingredient.amount);
      const have = inventory[ingredient.item] instanceof Decimal
        ? (inventory[ingredient.item] as Decimal).toNumber()
        : Number(inventory[ingredient.item] ?? 0);
      return need > have;
    });

  const canStartCook = !isCooking && !lessIngredients();

  const startCook = () => {
    dispatch({ type: "food.startCooking", item: selected.name as Food });
    selected.ingredients.forEach((ingredient) => {
      const amount = ingredient.amount instanceof Decimal
        ? ingredient.amount.toNumber()
        : Number(ingredient.amount);
      setToast({ content: `${ingredient.item} -${amount}` });
    });
    shortcutItem(selected.name);
  };

  const collect = () => {
    dispatch({ type: "food.collectCooked" });
    setToast({ content: `+1 ${cooking!.item}` });
  };

  // What to show on the action button
  const renderButton = () => {
    if (isThisCooking) {
      if (isReady) {
        return (
          <Button className="text-xs mt-2" onClick={collect}>
            Collect
          </Button>
        );
      }
      return (
        <Button disabled className="text-xs mt-2">
          Cooking... {formatTime(remainingSec)}
        </Button>
      );
    }

    if (isOtherCooking) {
      return (
        <Button disabled className="text-xs mt-2">
          Kitchen busy
        </Button>
      );
    }

    return (
      <Button disabled={!canStartCook} className="text-xs mt-2" onClick={startCook}>
        Cook
      </Button>
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

          {/* Cook time label */}
          {selected.cookTime && !isThisCooking && (
            <span className="text-xs text-shadow mt-1 opacity-80">
              Cooks in {formatTime(selected.cookTime)}
            </span>
          )}

          {/* Live progress bar while this food is cooking */}
          {isThisCooking && (
            <div className="w-full mt-2">
              <div className="flex justify-between text-xs text-shadow mb-1">
                <span>{isReady ? "Ready to collect!" : "Cooking..."}</span>
                {!isReady && (
                  <span>{formatTime(remainingSec)}</span>
                )}
              </div>
              <div className="w-full bg-brown-600 rounded-sm h-2 border border-white border-opacity-30">
                <div
                  className="h-full rounded-sm transition-all"
                  style={{
                    width:           `${progressPct}%`,
                    backgroundColor: isReady ? "#4ade80" : "#f97316",
                  }}
                />
              </div>
            </div>
          )}

          {/* Ingredient list — hidden while this food is cooking */}
          {!isThisCooking && (
            <div className="border-t border-white w-full mt-2 pt-1">
              {selected.ingredients.map((ingredient, index) => {
                const item            = ITEM_DETAILS[ingredient.item];
                const need            = ingredient.amount instanceof Decimal
                  ? ingredient.amount.toNumber()
                  : Number(ingredient.amount);
                const have            = inventory[ingredient.item] instanceof Decimal
                  ? (inventory[ingredient.item] as Decimal).toNumber()
                  : Number(inventory[ingredient.item] ?? 0);
                const notEnough       = have < need;

                return (
                  <div className="flex justify-center items-end" key={index}>
                    <img src={getImageSrc(item.image)} className="h-5 me-2" />
                    <span
                      className={classNames("text-xs text-shadow text-center mt-2", {
                        "text-red-500": notEnough,
                      })}
                    >
                      {need}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {renderButton()}
        </div>
      </OuterPanel>
    </div>
  );
};
