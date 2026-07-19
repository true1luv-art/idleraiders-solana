import React, { useContext, useMemo, useState } from "react";
import { Context } from "features/game/GameProvider";
import { InventoryItemName } from "features/game/types/game";
import { useGameStore } from "features/game/store/useGameStore";

import seeds from "assets/icons/seeds.png";
import close from "assets/icons/close.png";
import fishIcon from "assets/fish/fish.png";

import { Panel } from "components/ui/Panel";
import { Tab } from "components/ui/Tab";

import { SEEDS, CROPS } from "features/game/types/crops";
import { FOODS } from "features/game/types/craftables";
import { RESOURCES } from "features/game/types/resources";
import { FishName } from "features/game/types/fish";

import seed from "assets/crops/beetroot/seed.png";
import crop from "assets/crops/sunflower/crop.png";
import food from "assets/crops/wheat/flour.png";
import resource from "assets/resources/wood.png";
import animalIcon from "assets/animals/chicken.png";

import Decimal from "decimal.js-light";
import { InventoryTabContent } from "./InventoryTabContent";

type Tab = "basket";

interface Props {
  onClose: () => void;
}

export type TabItems = Record<string, { img: string; items: object }>;

const FISH_NAMES: FishName[] = [
  "Anchovy", "Sardine", "Tilapia", "Herring", "Trout", "Sea Bass",
  "Mackerel", "Salmon", "Red Snapper", "Barracuda", "Tuna",
  "Swordfish", "Blue Marlin", "Oarfish",
];

const FISH_ITEMS: Record<string, object> = Object.fromEntries(
  FISH_NAMES.map((name) => [name, { description: `A ${name.toLowerCase()}.` }])
);

// Keys that belong to the Animals section — both the animals themselves
// and the produce they yield. Cow/Sheep are not in RESOURCES so we stub them.
const ANIMAL_ITEMS: Record<string, object> = {
  Chicken: RESOURCES["Chicken"],
  Cow:     { description: "Produces milk. Eats Kale." },
  Sheep:   { description: "Produces wool. Eats Cabbage." },
  Egg:     RESOURCES["Egg"],
  Milk:    RESOURCES["Milk"],
  Wool:    RESOURCES["Wool"],
};

const ANIMAL_KEYS = new Set(Object.keys(ANIMAL_ITEMS));

// Raw resources: everything that isn't an animal or animal produce
const RAW_RESOURCES = Object.fromEntries(
  Object.entries(RESOURCES).filter(([k]) => !ANIMAL_KEYS.has(k))
);

const BASKET_CATEGORIES: TabItems = {
  Seeds: {
    img: seed,
    items: SEEDS(),
  },
  Resources: {
    img: resource,
    items: RAW_RESOURCES,
  },
  Animals: {
    img: animalIcon,
    items: ANIMAL_ITEMS,
  },
  Crops: {
    img: crop,
    items: CROPS(),
  },
  Foods: {
    img: food,
    items: FOODS(),
  },
  Fish: {
    img: fishIcon,
    items: FISH_ITEMS,
  },
};

export type Inventory = Partial<Record<InventoryItemName, Decimal>>;

const makeInventoryItems = (inventory: Inventory) => {
  const items = Object.keys(inventory) as InventoryItemName[];
  return items.filter(
    (itemName) => !!inventory[itemName] && !new Decimal(inventory[itemName] || 0).equals(0)
  );
};

export const InventoryItems: React.FC<Props> = ({ onClose }) => {
  const { shortcutItem } = useContext(Context);
  const inventory = useGameStore((s) => s.state.inventory);
  const chickens = useGameStore((s) => s.state.chickens);
  const cows     = useGameStore((s) => s.state.cows);
  const sheep    = useGameStore((s) => s.state.sheep);

  // Merge real inventory with animal counts so the Animals section can display them
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

  const [currentTab, setCurrentTab] = useState<Tab>("basket");
  const [inventoryItems] = useState<InventoryItemName[]>(
    makeInventoryItems(mergedInventory)
  );
  const [selectedItem, setSelectedItem] = useState<InventoryItemName>();

  const handleTabClick = (tab: Tab) => {
    setCurrentTab(tab);
  };

  const handleItemSelected = (item: InventoryItemName) => {
    shortcutItem(item);
    setSelectedItem(item);
  };

  return (
    <Panel className="pt-5 relative">
      <div className="flex justify-between absolute top-1.5 left-0.5 right-0 items-center">
        <div className="flex">
          <Tab
            className="flex items-center"
            isActive={currentTab === "basket"}
            onClick={() => handleTabClick("basket")}
          >
            <img src={typeof seeds === "string" ? seeds : seeds?.src} className="h-4 sm:h-5 mr-2" />
            <span className="text-xs sm:text-sm overflow-hidden text-ellipsis">
              Basket
            </span>
          </Tab>
        </div>
        <img
          src={typeof close === "string" ? close : close?.src}
          className="h-6 cursor-pointer mr-2 mb-1"
          onClick={() => onClose()}
        />
      </div>

      <InventoryTabContent
        tabItems={BASKET_CATEGORIES}
        selectedItem={selectedItem}
        setDefaultSelectedItem={setSelectedItem}
        inventory={mergedInventory}
        inventoryItems={inventoryItems}
        onClick={handleItemSelected}
      />
    </Panel>
  );
};
