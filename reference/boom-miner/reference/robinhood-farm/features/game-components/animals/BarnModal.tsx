"use client";

import React, { useContext, useState } from "react";
import Decimal from "decimal.js-light";

import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/Button";
import {
  ModalShell,
  ModalTitleBar,
  ActionDock,
} from "@/components/ui/modal";
import { ShopShowcase, ShowcaseChip } from "@/components/ui/ShopShowcase";
import { ShopShelf } from "@/components/ui/ShopShelf";

import { ANIMALS } from "@/features/types/gameplay/craftables";
import { ITEM_DETAILS } from "@/features/types/item-details";
import { getBuyPrice } from "@/features/types/gameplay/craftables";
import { useGameStore } from "@/features/game-stores/useGameStore";
import { ToastContext } from "@/context/ToastContext";

const chicken = "/assets/animals/chicken.png";
const token   = "/assets/icons/token.png";

type AnimalName = keyof typeof ANIMALS;

interface Props {
  show: boolean;
  onClose: () => void;
}

/**
 * Barn on the new modal shell — buy animals using the Showcase + Shelf pattern.
 */
export const BarnModal: React.FC<Props> = ({ show, onClose }) => {
  const animalNames = Object.keys(ANIMALS) as AnimalName[];
  const [selected, setSelected] = useState<AnimalName>(animalNames[0]);

  const { addToast } = useContext(ToastContext);
  const state    = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  const inventory = state.inventory;

  const animal   = ANIMALS[selected];
  const buyPrice = getBuyPrice(animal, inventory);
  const lessFunds = new Decimal(state.balance).lessThan(buyPrice.toString());

  const buy = () => {
    dispatch({ type: "item.crafted", item: selected, amount: 1 });
    addToast("-" + buyPrice.toString() + " coins");
  };

  return (
    <ModalShell
      show={show}
      onClose={onClose}
      tier="panel"
      titleBar={
        <ModalTitleBar
          icon={chicken}
          title="Barn"
          subtitle="Buy animals"
          onClose={onClose}
        />
      }
      actionDock={
        <ActionDock
          info={
            <span className="truncate">
              Balance ${new Decimal(state.balance).toDecimalPlaces(3, Decimal.ROUND_DOWN).toString()}
            </span>
          }
        >
          <Button disabled={lessFunds} className="text-xs px-3 w-auto" onClick={buy}>
            Buy
          </Button>
        </ActionDock>
      }
    >
      <ShopShowcase
        image={ITEM_DETAILS[selected]?.image}
        name={selected}
        description={animal.description}
        chips={
          <ShowcaseChip icon={token} danger={lessFunds}>
            {`$${buyPrice.toString()}`}
          </ShowcaseChip>
        }
      />

      <ShopShelf>
        {animalNames.map((name) => (
          <Box
            isSelected={selected === name}
            key={name}
            onClick={() => setSelected(name)}
            image={ITEM_DETAILS[name]?.image}
            count={inventory[name]}
          />
        ))}
      </ShopShelf>
    </ModalShell>
  );
};
