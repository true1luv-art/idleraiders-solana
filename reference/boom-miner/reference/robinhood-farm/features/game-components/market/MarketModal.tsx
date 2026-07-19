"use client";

import React, { useContext, useEffect, useMemo, useState } from "react";
import Decimal from "decimal.js-light";
import { Modal } from "react-bootstrap";

import { Box } from "@/components/ui/Box";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import {
  ModalShell,
  ModalTitleBar,
  NavRail,
  ActionDock,
} from "@/components/ui/modal";
import { ShopShowcase, ShowcaseChip } from "@/components/ui/ShopShowcase";
import { ShopShelf } from "@/components/ui/ShopShelf";
import { SectionLabel } from "@/components/ui/modal";

import { secondsToMidString } from "@/features/utils/time";
import { Context } from "@/context/GameContext";
import { Craftable, Food, FOODS } from "@/features/types/gameplay/craftables";
import { CropName, CROPS, SEEDS, SeedName } from "@/features/types/gameplay/crops";
import { RESOURCES } from "@/features/types/gameplay/resources";
import { ITEM_DETAILS } from "@/features/types/item-details";
import { ToastContext } from "@/context/ToastContext";
import { getBuyPrice } from "@/features/types/gameplay/craftables";
import { getCropTime } from "@/features/events/plant/plant";
import { getSellPrice, hasSellBoost } from "@/features/game/boosts";
import { useGameStore } from "@/features/game-stores/useGameStore";
import { getSkillLevel } from "@/features/game/skills";
import type { ProduceName } from "@/features/events/sell/sellProduce";
import { FISH_TABLE } from "@/features/game/fishing";
import type { FishName } from "@/features/types/gameplay/fish";

const token = "/assets/icons/token.png";
const timer = "/assets/icons/timer.png";
const basket = "/assets/icons/basket.png";
const seedsIcon = "/assets/icons/seeds.png";
const cropIcon = "/assets/crops/potato/crop.png";
const foodIcon = "/assets/foods/roasted_potato.png";
const produceIcon = "/assets/resources/egg.png";
const fishIcon    = "/assets/fish/fish.png";
const lightning   = "/assets/icons/lightning.png";

type Tab = "buy" | "sell";

const NAV_ITEMS = [
  { id: "buy",  label: "Buy",  icon: seedsIcon },
  { id: "sell", label: "Sell", icon: cropIcon  },
];

const PRODUCE_ITEMS: ProduceName[] = ["Egg", "Milk", "Wool"];

interface Props {
  show: boolean;
  onClose: () => void;
}

/**
 * Market on the new modal shell — NavRail (Buy / Sell / Food / Produce) +
 * Showcase + Shelf (docs/modal-redesign-plan.md §2.3, §3). Buy logic carried
 * over from the old Seeds component, crop sell logic from the old Plants
 * component, and Food / Produce selling consolidated from the former Bazaar.
 */
export const MarketModal: React.FC<Props> = ({ show, onClose }) => {
  const [tab, setTab] = useState<Tab>("buy");
  const [selectedSeedName, setSelectedSeedName] = useState<SeedName>("Potato Seed");
  const [selectedCropName, setSelectedCropName] = useState<CropName>("Potato");
  const [isSellAllModalOpen, showSellAllModal] = useState(false);
  const [isPriceBoosted, setIsPriceBoosted] = useState(false);

  const { addToast } = useContext(ToastContext);
  const { shortcutItem } = useContext(Context);
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  const inventory = state.inventory;
  const farmingLevel = getSkillLevel(state.skills?.farming ?? 0);

  const foods = FOODS();
  const [selectedFood, setSelectedFood] = useState<Craftable & { name: Food }>(
    foods["Roasted Potato"] as Craftable & { name: Food }
  );
  const [selectedProduce, setSelectedProduce] = useState<ProduceName>("Egg");
  const [selectedFish, setSelectedFish] = useState<FishName>("Anchovy");

  const seeds = useMemo(() => SEEDS(), []);
  const crops = useMemo(() => CROPS(), []);
  const selectedSeed = seeds[selectedSeedName];
  const selectedCrop = crops[selectedCropName];

  useEffect(() => {
    setIsPriceBoosted(hasSellBoost(inventory));
  }, [state.inventory]);

  // ── Buy (seeds) ──────────────────────────────────────────────────────
  const buyPrice = getBuyPrice(selectedSeed, inventory);
  const levelRequirement = selectedSeed.levelRequirement ?? 0;
  const seedLocked = farmingLevel < levelRequirement;

  const lessFunds = (amount = 1) =>
    new Decimal(state.balance).lessThan(buyPrice.mul(amount).toString());

  const buy = (amount = 1) => {
    dispatch({ type: "item.crafted", item: selectedSeed.name, amount });
    addToast("-" + buyPrice.mul(amount).toString() + " coins");
    shortcutItem(selectedSeed.name);
  };

  const seedCropName = selectedSeed.name.split(" ")[0] as CropName;
  const seedCrop = crops[seedCropName];

  // ── Sell (crops) ─────────────────────────────────────────────────────
  const cropSellPrice = getSellPrice(selectedCrop, inventory);
  const cropAmount = new Decimal(inventory[selectedCrop.name] || 0).toNumber();

  const sellCrop = (amount = 1) => {
    dispatch({ type: "item.sell", item: selectedCrop.name, amount });
    addToast("+" + cropSellPrice.mul(amount).toString() + " coins");
  };

  // ── Sell (food) ──────────────────────────────────────────────────────
  const foodSellPrice = selectedFood.sellPrice || new Decimal(0);

  const sellFood = (amount = 1) => {
    dispatch({ type: "food.sell", item: selectedFood.name, amount });
    addToast("+" + foodSellPrice.mul(amount).toString() + " coins");
  };

  // ── Sell (fish) ───────────────────────────────────────────────────────
  const fishEntry      = FISH_TABLE.find((f) => f.name === selectedFish)!;
  const fishSellPrice  = new Decimal(fishEntry?.sellPrice ?? 0);
  const fishCount      = new Decimal(inventory[selectedFish] ?? 0).toNumber();

  const sellFishItem = (amount = 1) => {
    dispatch({ type: "fish.sell", item: selectedFish, amount });
    addToast("+" + fishSellPrice.mul(amount).toFixed(2) + " coins");
  };

  // ── Sell (produce) ───────────────────────────────────────────────────
  const produceSellPrice = new Decimal(RESOURCES[selectedProduce]?.sellPrice ?? 0);

  const sellProduce = (amount = 1) => {
    dispatch({ type: "produce.sell", item: selectedProduce, amount });
    addToast("+" + produceSellPrice.mul(amount).toFixed(2) + " coins");
  };

  // ── Active sell target — unified across all sell sections ────────────
  type SellSection = "crop" | "food" | "produce" | "fish";
  const [sellSection, setSellSection] = useState<SellSection>("crop");

  const sellTarget = {
    crop:    { name: selectedCrop.name as string,    stock: cropAmount,     run: sellCrop    },
    food:    { name: selectedFood.name as string,    stock: new Decimal(inventory[selectedFood.name] || 0).toNumber(), run: sellFood    },
    produce: { name: selectedProduce as string,      stock: new Decimal(inventory[selectedProduce] || 0).toNumber(),   run: sellProduce },
    fish:    { name: selectedFish as string,         stock: fishCount,      run: sellFishItem },
  } as const;

  const active  = tab === "buy" ? sellTarget.crop : sellTarget[sellSection];
  const noStock = active.stock === 0;

  // Helper to select an item and update both section + specific item state
  const selectSellItem = (section: SellSection, fn: () => void) => {
    setSellSection(section);
    fn();
  };

  const handleSellAll = () => {
    active.run(active.stock);
    showSellAllModal(false);
  };

  const openSellAllConfirmation = () => {
    if (active.stock === 1) {
      active.run(1);
    } else {
      showSellAllModal(true);
    }
  };

  // ── Showcase — driven by whichever item is active ────────────────────
  const showcaseImage = tab === "buy"
    ? ITEM_DETAILS[selectedSeed.name]?.image
    : sellSection === "crop"    ? ITEM_DETAILS[selectedCrop.name]?.image
    : sellSection === "food"    ? ITEM_DETAILS[selectedFood.name]?.image
    : sellSection === "produce" ? ITEM_DETAILS[selectedProduce]?.image
    : ITEM_DETAILS[selectedFish]?.image;

  const showcaseName = tab === "buy" ? selectedSeed.name : active.name;

  const showcasePrice = tab === "buy"
    ? buyPrice.toString()
    : sellSection === "crop"    ? cropSellPrice.toString()
    : sellSection === "food"    ? foodSellPrice.toNumber().toString()
    : sellSection === "produce" ? produceSellPrice.toFixed(2)
    : fishSellPrice.toFixed(2);

  // ── Body ─────────────────────────────────────────────────────────────
  const body: React.ReactNode = tab === "buy" ? (
    <div className="flex flex-col gap-2">
      <ShopShowcase
        image={showcaseImage}
        name={showcaseName}
        chips={
          <>
            {seedCrop && (
              <ShowcaseChip icon={timer}>
                {secondsToMidString(getCropTime(seedCrop.name, inventory))}
              </ShowcaseChip>
            )}
            <ShowcaseChip icon={token} danger={lessFunds()}>
              {`$${buyPrice.toString()}`}
            </ShowcaseChip>
          </>
        }
      >
        {seedLocked && (
          <div className="flex items-center gap-1.5">
            <img src="/assets/skills/lock.png" className="h-5 pixelated" alt="" />
            <span className="text-[10px] text-shadow text-red-400">
              Requires farming level {levelRequirement}
            </span>
          </div>
        )}
      </ShopShowcase>

      <ShopShelf>
        {Object.values(seeds).map((item: Craftable) => (
          <Box
            isSelected={selectedSeed.name === item.name}
            key={item.name}
            onClick={() => setSelectedSeedName(item.name as SeedName)}
            image={ITEM_DETAILS[item.name]?.image}
            count={inventory[item.name]}
          />
        ))}
      </ShopShelf>
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      {/* Showcase for whichever sell item is selected */}
      <ShopShowcase
        image={showcaseImage}
        name={showcaseName}
        chips={
          <ShowcaseChip icon={token}>
            {isPriceBoosted && sellSection === "crop" && (
              <img src={lightning} alt="Price boosted" className="h-4 pixelated" />
            )}
            {`$${showcasePrice}`}
          </ShowcaseChip>
        }
      />

      {/* CROPS section */}
      <SectionLabel icon={cropIcon}>Crops</SectionLabel>
      <ShopShelf>
        {Object.values(crops).map((item) => (
          <Box
            isSelected={sellSection === "crop" && selectedCrop.name === item.name}
            key={item.name}
            onClick={() => selectSellItem("crop", () => setSelectedCropName(item.name))}
            image={ITEM_DETAILS[item.name]?.image}
            count={inventory[item.name]}
          />
        ))}
      </ShopShelf>

      {/* FOOD section */}
      <SectionLabel icon={foodIcon}>Food</SectionLabel>
      <ShopShelf>
        {Object.values(foods).map(
          (item) =>
            item && (
              <Box
                isSelected={sellSection === "food" && selectedFood.name === item.name}
                key={item.name}
                onClick={() => selectSellItem("food", () => setSelectedFood(item as Craftable & { name: Food }))}
                image={ITEM_DETAILS[item.name]?.image}
                count={inventory[item.name]}
              />
            )
        )}
      </ShopShelf>

      {/* PRODUCE section */}
      <SectionLabel icon={produceIcon}>Produce</SectionLabel>
      <ShopShelf>
        {PRODUCE_ITEMS.map((name) => (
          <Box
            isSelected={sellSection === "produce" && selectedProduce === name}
            key={name}
            onClick={() => selectSellItem("produce", () => setSelectedProduce(name))}
            image={ITEM_DETAILS[name]?.image}
            count={inventory[name]}
          />
        ))}
      </ShopShelf>

      {/* FISH section */}
      <SectionLabel icon={fishIcon}>Fish</SectionLabel>
      <ShopShelf>
        {FISH_TABLE.map(({ name }) => (
          <Box
            isSelected={sellSection === "fish" && selectedFish === name}
            key={name}
            onClick={() => selectSellItem("fish", () => setSelectedFish(name))}
            image={ITEM_DETAILS[name]?.image}
            count={inventory[name]}
          />
        ))}
      </ShopShelf>
    </div>
  );

  // ── Dock ─────────────────────────────────────────────────────────────
  const dock =
    tab === "buy" ? (
      <ActionDock
        info={
          <span className="truncate">
            Balance ${new Decimal(state.balance).toDecimalPlaces(3, Decimal.ROUND_DOWN).toString()}
          </span>
        }
      >
        {seedLocked || selectedSeed.disabled ? (
          <span className="text-xs text-shadow px-2">Locked</span>
        ) : (
          <>
            <Button
              disabled={lessFunds()}
              className="text-xs px-3 w-auto"
              onClick={() => buy(1)}
            >
              Buy 1
            </Button>
            <Button
              disabled={lessFunds(10)}
              className="text-xs px-3 w-auto whitespace-nowrap"
              onClick={() => buy(10)}
            >
              Buy 10
            </Button>
          </>
        )}
      </ActionDock>
    ) : (
      <ActionDock
        info={
          <span className="truncate">
            Owned: {active.stock} {active.name}
          </span>
        }
      >
        <Button
          disabled={active.stock < 1}
          className="text-xs px-3 w-auto"
          onClick={() => active.run(1)}
        >
          Sell 1
        </Button>
        <Button
          disabled={noStock}
          className="text-xs px-3 w-auto whitespace-nowrap"
          onClick={openSellAllConfirmation}
        >
          Sell All
        </Button>
      </ActionDock>
    );

  return (
    <>
      <ModalShell
        show={show}
        onClose={onClose}
        tier="panel"
        titleBar={
          <ModalTitleBar
            icon={basket}
            title="Market"
            subtitle="Buy seeds · sell crops, food & produce"
            onClose={onClose}
          />
        }
        navRail={
          <NavRail
            items={NAV_ITEMS}
            activeId={tab}
            onSelect={(id) => setTab(id as Tab)}
          />
        }
        actionDock={dock}
        bodyClassName="overflow-y-auto px-1 pb-1"
      >
        {body}
      </ModalShell>

      <Modal centered show={isSellAllModalOpen} onHide={() => showSellAllModal(false)}>
        <Panel className="md:w-4/5 m-auto">
          <div className="m-auto flex flex-col">
            <span className="text-sm text-center text-shadow">
              Are you sure you want to sell all your {active.name}?
            </span>
            <span className="text-sm text-center text-shadow mt-1">
              Total: {active.stock}
            </span>
          </div>
          <div className="flex justify-content-around p-1">
            <Button disabled={noStock} className="text-xs" onClick={handleSellAll}>
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
    </>
  );
};
