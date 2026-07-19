import React from "react";

import { PlayerHud } from "@/features/game-components/hud/components/PlayerHud";
import { Inventory } from "@/features/game-components/hud/components/Inventory";
import { VisitBanner } from "@/features/game-components/hud/components/VisitBanner";
import { FishingCooldown } from "@/features/game-components/fishing/components/FishingCooldown";

/**
 * Heads-up display — small overlayed panel showing balance, inventory, and status.
 */
export const Hud: React.FC<{ wallet?: string }> = ({ wallet }) => {
  return (
    <div data-html2canvas-ignore="true" aria-label="Hud">
      <PlayerHud wallet={wallet} />
      <Inventory wallet={wallet} />
      <VisitBanner />
      <FishingCooldown />
    </div>
  );
};
