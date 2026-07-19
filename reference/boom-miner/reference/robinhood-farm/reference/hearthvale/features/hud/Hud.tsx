import React from "react";

import { PlayerHud } from "./components/PlayerHud";
import { Inventory } from "./components/Inventory";
import { VisitBanner } from "./components/VisitBanner";
import { FishingCooldown } from "features/fishing/components/FishingCooldown";

/**
 * Heads up display - a concept used in games for the small overlayed display of information.
 * Balances, Inventory, actions etc.
 */
export const Hud: React.FC = () => {
  return (
    <div data-html2canvas-ignore="true" aria-label="Hud">
      <PlayerHud />
      <Inventory />
      <VisitBanner />
      <FishingCooldown />
    </div>
  );
};
