"use client";

import React, { useState, useCallback } from "react";
import Decimal from "decimal.js-light";
import { FOODS } from "@/features/types/gameplay/craftables";
import type { Food } from "@/features/types/gameplay/craftables";
import type { InventoryItemName } from "@/features/types/gameplay/game";
import { ITEM_DETAILS } from "@/features/types/item-details";
import { useGameStore } from "@/features/game-stores/useGameStore";
import { ModalShell, ModalTitleBar, ActionDock } from "@/components/ui/modal";
import { Button } from "@/components/ui/Button";
import { Box } from "@/components/ui/Box";
import { ShopShowcase, ShowcaseChip } from "@/components/ui/ShopShowcase";
import { ShopShelf } from "@/components/ui/ShopShelf";

const kitchenIcon = "/assets/buildings/kitchen_building.png";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getItemImage(name: string): string {
  const detail = ITEM_DETAILS[name as InventoryItemName];
  return detail?.image ?? "/assets/icons/token.png";
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  show: boolean;
  onClose: () => void;
}

export const KitchenModal: React.FC<Props> = ({ show, onClose }) => {
  const inventory = useGameStore((s) => s.state?.inventory ?? {});
  const send      = useGameStore((s) => s.send);

  const foods    = FOODS();
  const foodKeys = Object.keys(foods) as Food[];

  const [selected, setSelected] = useState<Food>(foodKeys[0]);
  const [cooking,  setCooking]  = useState(false);

  const getIngredients = useCallback(
    (food: Food) =>
      foods[food].ingredients.map(({ item, amount }) => ({
        item: item as InventoryItemName,
        amount,
        have: new Decimal(
          (inventory[item as InventoryItemName] as Decimal | undefined) ?? 0
        ),
      })),
    [foods, inventory],
  );

  const canCook = useCallback(
    (food: Food) => getIngredients(food).every(({ have, amount }) => have.gte(amount)),
    [getIngredients],
  );

  const handleCook = useCallback(async () => {
    if (!selected || !canCook(selected) || cooking) return;
    setCooking(true);
    try {
      send({ type: "food.cook", food: selected, amount: 1 });
    } finally {
      setCooking(false);
    }
  }, [selected, canCook, cooking, send]);

  const selectedIngredients = getIngredients(selected);
  const selectedCookable    = canCook(selected);

  // Status text for the action dock footer
  const statusText = cooking
    ? `Cooking ${selected}...`
    : "Kitchen idle";

  return (
    <ModalShell
      show={show}
      onClose={onClose}
      tier="panel"
      titleBar={
        <ModalTitleBar
          icon={kitchenIcon}
          title="Kitchen"
          subtitle="Cook food"
          onClose={onClose}
        />
      }
      actionDock={
        <ActionDock
          info={
            <span
              className="text-[9px] text-white/70"
              style={{ fontFamily: "var(--font-press-start)" }}
            >
              {statusText}
            </span>
          }
        >
          <Button
            onClick={handleCook}
            disabled={!selectedCookable || cooking}
            className="text-xs px-4 w-auto"
          >
            {cooking ? "Cooking..." : "Cook"}
          </Button>
        </ActionDock>
      }
    >
      {/* Selected recipe detail */}
      <ShopShowcase
        image={ITEM_DETAILS[selected as InventoryItemName]?.image}
        name={selected}
        description={ITEM_DETAILS[selected as InventoryItemName]?.description}
        chips={
          <>
            {selectedIngredients.map(({ item, amount, have }) => (
              <ShowcaseChip
                key={item}
                icon={getItemImage(item)}
                danger={have.lt(amount)}
              >
                {amount.toNumber()}
              </ShowcaseChip>
            ))}
          </>
        }
      />

      {/* Recipe grid */}
      <ShopShelf>
        {foodKeys.map((food) => {
          const inv = inventory[food as InventoryItemName];
          const count = inv instanceof Decimal ? inv : new Decimal(inv ?? 0);
          return (
            <Box
              key={food}
              image={getItemImage(food)}
              isSelected={food === selected}
              count={count.gt(0) ? count : undefined}
              onClick={() => setSelected(food)}
            />
          );
        })}
      </ShopShelf>
    </ModalShell>
  );
};
