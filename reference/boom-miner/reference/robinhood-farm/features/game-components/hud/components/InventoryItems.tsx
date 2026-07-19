"use client";

/**
 * components/game/hud/components/InventoryItems.tsx
 *
 * Inventory on the new ModalShell (Phase D of docs/modal-redesign-plan.md §3):
 * NavRail filter rail (All + categories), category-grouped Box grid with
 * SectionLabel dividers, and the selected-item detail in the ActionDock.
 * Clicking an item still sets it as the active HUD shortcut.
 */

import React, { useContext, useEffect, useMemo, useState } from "react";
import Decimal from "decimal.js-light";


// Public-path references — served from /public/assets/ without bundler aliases.
const basket     = "/assets/icons/basket.png";
const timer      = "/assets/icons/timer.png";
const seed       = "/assets/crops/beetroot/seed.png";
const crop       = "/assets/crops/sunflower/crop.png";
const food       = "/assets/crops/wheat/flour.png";
const resource   = "/assets/resources/wood.png";
const animalIcon = "/assets/animals/chicken.png";

import { ModalShell, ModalTitleBar, NavRail, ActionDock, SectionLabel } from "@/components/ui/modal";
import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/Button";
import { getImageSrc } from "@/features/utils/getImageSrc";

import { Context } from "@/context/GameContext";
import { ToastContext } from "@/context/ToastContext";
import { InventoryItemName } from "@/features/types/gameplay/game";
import { useGameStore } from "@/features/game-stores/useGameStore";
import { SEEDS, CROPS, CropName } from "@/features/types/gameplay/crops";
import { FOODS, FOOD_STAMINA_RESTORE, type Food } from "@/features/types/gameplay/craftables";
import { RESOURCES } from "@/features/types/gameplay/resources";
import type { FishName } from "@/features/types/gameplay/fish";
import { ITEM_DETAILS } from "@/features/types/item-details";
import { getShortcuts } from "@/features/game-components/hud/lib/shortcuts";
import { getCropTime } from "@/features/events/plant/plant";
import { secondsToMidString } from "@/features/utils/time";


interface Props {
  show:    boolean;
  onClose: () => void;
  wallet?: string;
}

export type TabItems = Record<string, { img: string; items: object }>;
export type Inventory = Partial<Record<InventoryItemName, Decimal>>;

const FISH_NAMES: FishName[] = [
  "Anchovy", "Sardine", "Tilapia", "Herring", "Trout", "Sea Bass",
  "Mackerel", "Salmon", "Red Snapper", "Barracuda", "Tuna",
  "Swordfish", "Blue Marlin", "Oarfish",
];

const FISH_ITEMS: Record<string, object> = Object.fromEntries(
  FISH_NAMES.map((name) => [name, { description: `A ${name.toLowerCase()}.` }])
);

// Livestock live in the Animals tab. Their produce (Egg / Milk / Wool) now
// belongs to Resources per the redesign, so those keys are NOT listed here.
const ANIMAL_ITEMS: Record<string, object> = {
  Chicken: RESOURCES["Chicken"],
  Cow:     { description: "Produces milk. Eats Kale." },
  Sheep:   { description: "Produces wool. Eats Cabbage." },
};

const ANIMAL_KEYS = new Set(Object.keys(ANIMAL_ITEMS));

// Everything in RESOURCES that isn't a livestock animal — this already covers
// Wood/Stone/Iron/Gold, the fish, and the Egg/Milk/Wool produce.
const RAW_RESOURCES = Object.fromEntries(
  Object.entries(RESOURCES).filter(([k]) => !ANIMAL_KEYS.has(k))
);

const RESOURCE_ITEMS: Record<string, object> = {
  ...RAW_RESOURCES,
};

// Images/descriptions for items with no ITEM_DETAILS entry.
const ITEM_OVERRIDES: Record<string, { image: string; description: string }> = {};

const itemImage = (item: string) =>
  ITEM_DETAILS[item as InventoryItemName]?.image ?? ITEM_OVERRIDES[item]?.image;

const itemDescription = (item: string) =>
  ITEM_DETAILS[item as InventoryItemName]?.description ?? ITEM_OVERRIDES[item]?.description ?? "";

const BASKET_CATEGORIES: TabItems = {
  Seeds:     { img: seed,       items: SEEDS()        },
  Resources: { img: resource,   items: RESOURCE_ITEMS },
  Animals:   { img: animalIcon, items: ANIMAL_ITEMS   },
  Crops:     { img: crop,       items: CROPS()        },
  Foods:     { img: food,       items: FOODS()        },
};

const CATEGORY_NAMES = Object.keys(BASKET_CATEGORIES);

type FilterId = "all" | (typeof CATEGORY_NAMES)[number];

const RAIL_ITEMS = [
  { id: "all", label: "All", icon: basket },
  ...CATEGORY_NAMES.map((cat) => ({
    id:    cat,
    label: cat,
    icon:  BASKET_CATEGORIES[cat].img,
  })),
];

const makeInventoryItems = (inventory: Inventory): InventoryItemName[] =>
  (Object.keys(inventory) as InventoryItemName[]).filter(
    (name) => !!inventory[name] && !new Decimal(inventory[name] || 0).equals(0)
  );

const isSeed = (item: InventoryItemName) => item in SEEDS();
const isFood = (item?: InventoryItemName): item is Food => !!item && item in FOODS();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const InventoryItems: React.FC<Props> = ({ show, onClose, wallet: _wallet }) => {
  const { shortcutItem } = useContext(Context);
  const { addToast }     = useContext(ToastContext);
  const dispatch  = useGameStore((s) => s.dispatch);
  const inventory = useGameStore((s) => s.state.inventory);
  const stamina   = useGameStore((s) => s.state.stamina);
  const chickens  = useGameStore((s) => s.state.chickens);
  const cows      = useGameStore((s) => s.state.cows);
  const sheep     = useGameStore((s) => s.state.sheep);

  const mergedInventory = useMemo<Inventory>(() => {
    const chickenCount = Object.keys(chickens ?? {}).length;
    const cowCount     = Object.keys(cows ?? {}).length;
    const sheepCount   = Object.keys(sheep ?? {}).length;
    return {
      ...inventory,
      ...(chickenCount > 0 ? { Chicken: new Decimal(chickenCount) } : {}),
      ...(cowCount > 0     ? { Cow:     new Decimal(cowCount) }     : {}),
      ...(sheepCount > 0   ? { Sheep:   new Decimal(sheepCount) }   : {}),
    };
  }, [inventory, chickens, cows, sheep]);

  const inventoryItems = useMemo(
    () => makeInventoryItems(mergedInventory),
    [mergedInventory]
  );

  // Category → owned items mapping
  const inventoryMapping = useMemo(() => {
    return inventoryItems.reduce<Record<string, InventoryItemName[]>>((acc, curr) => {
      const category = CATEGORY_NAMES.find(
        (cat) => curr in BASKET_CATEGORIES[cat].items
      );
      if (category) acc[category] = [...(acc[category] || []), curr];
      return acc;
    }, {});
  }, [inventoryItems]);

  const [filter, setFilter]             = useState<FilterId>("all");
  const [selectedItem, setSelectedItem] = useState<InventoryItemName>();

  // Default selection — active shortcut, else first owned item
  useEffect(() => {
    if (!show || selectedItem) return;
    const firstCategoryWithItem = CATEGORY_NAMES.find(
      (cat) => !!inventoryMapping[cat]?.length
    );
    const defaultSelected =
      getShortcuts()[0] ||
      (firstCategoryWithItem && inventoryMapping[firstCategoryWithItem][0]);
    if (defaultSelected) setSelectedItem(defaultSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const handleItemSelected = (item: InventoryItemName) => {
    shortcutItem(item);
    setSelectedItem(item);
  };

  const getCropHarvestTime = (seedName = "") => {
    const cropName = seedName.split(" ")[0] as CropName;
    return secondsToMidString(getCropTime(cropName, mergedInventory));
  };

  const visibleCategories =
    filter === "all" ? CATEGORY_NAMES : CATEGORY_NAMES.filter((c) => c === filter);

  const inventoryIsEmpty = visibleCategories.every(
    (cat) => !inventoryMapping[cat]?.length
  );

  const selectedCount = selectedItem ? mergedInventory[selectedItem] : undefined;

  // ── Eat action ─────────────────────────────────────────────────────────��───
  // Food is consumed one unit at a time to restore stamina. The button is only
  // shown for food items and is disabled when the player has none or is already
  // at full stamina (mirrors the guards in the consumeFood reducer/validator).
  const maxStamina     = stamina?.max ?? 100;
  const staminaIsFull  = (stamina?.current ?? 0) >= maxStamina;
  const selectedIsFood = isFood(selectedItem);
  const ownedFoodCount = selectedIsFood
    ? new Decimal(selectedCount ?? 0).toNumber()
    : 0;
  const staminaPerBite = selectedIsFood ? FOOD_STAMINA_RESTORE[selectedItem as Food] : 0;

  const eat = () => {
    if (!selectedIsFood || ownedFoodCount < 1 || staminaIsFull) return;
    dispatch({ type: "food.consume", item: selectedItem!, amount: 1 });
    addToast(`+${staminaPerBite} Stamina`);
  };

  // ── ActionDock content ───────────────────────────────────────────────────
  let dockInfo: React.ReactNode;

  {
    dockInfo = selectedItem ? (
      <div className="flex items-center gap-2 min-w-0">
        <img
          src={getImageSrc(itemImage(selectedItem) ?? "")}
          alt=""
          className="w-8 h-8 object-contain pixelated shrink-0"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-white text-shadow truncate">
            {selectedItem}
            {selectedCount && (
              <span className="text-white/50 ml-1.5">x{selectedCount.toString()}</span>
            )}
          </span>
          <span className="text-[9px] text-white/60 truncate">{itemDescription(selectedItem)}</span>
        </div>
        {isSeed(selectedItem) && (
          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-1 rounded bg-black/30 shrink-0">
            <img src={timer || "/placeholder.svg"} alt="" className="w-3.5 h-3.5 object-contain pixelated" />
            <span className="text-[9px] text-yellow-200 font-semibold whitespace-nowrap">
              {getCropHarvestTime(selectedItem)}
            </span>
          </span>
        )}
        {selectedIsFood && (
          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-1 rounded bg-black/30 shrink-0">
            <span className="text-[9px] text-green-300 font-semibold whitespace-nowrap">
              +{staminaPerBite} Stamina
            </span>
          </span>
        )}
      </div>
    ) : (
      <span>Select an item</span>
    );
  }

  return (

    <ModalShell
      show={show}
      onClose={onClose}
      tier="panel"
      titleBar={
        <ModalTitleBar
          icon={basket}
          title="Inventory"
          subtitle={`${inventoryItems.length} item type${inventoryItems.length !== 1 ? "s" : ""} in your basket`}
          onClose={onClose}
        />
      }
      navRail={
        <NavRail
          items={RAIL_ITEMS}
          activeId={filter}
          onSelect={(id) => setFilter(id as FilterId)}
        />
      }
      actionDock={
        <ActionDock info={dockInfo}>
          {selectedIsFood && (
            <Button
              disabled={ownedFoodCount < 1 || staminaIsFull}
              className="text-xs px-3 w-auto whitespace-nowrap"
              onClick={eat}
            >
              {staminaIsFull ? "Full" : "Eat"}
            </Button>
          )}
        </ActionDock>
      }
      bodyClassName="px-1 pb-1"
    >
      {inventoryIsEmpty ? (
        <p className="text-xs text-white/50 italic px-1 py-6 text-center">
          {filter === "all" ? "Your basket is empty." : `No ${filter} in inventory.`}
        </p>
      ) : (
        <div className="flex flex-col gap-2 py-1">
          {visibleCategories.map((category) => {
            const items = inventoryMapping[category];
            if (!items?.length) return null;
            return (
              <div className="flex flex-col gap-1" key={category}>
                <SectionLabel icon={BASKET_CATEGORIES[category].img}>
                  {category}
                </SectionLabel>
                <div className="flex flex-wrap">
                  {items.map((item) =>
                    itemImage(item) ? (
                      <Box
                        count={mergedInventory[item]}
                        isSelected={selectedItem === item}
                        key={item}
                        onClick={() => handleItemSelected(item)}
                        image={itemImage(item)}
                      />
                    ) : null
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ModalShell>
  );
};
