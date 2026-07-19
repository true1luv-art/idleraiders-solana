import React, { useEffect } from "react";
import { Modal } from "react-bootstrap";

import { Panel } from "components/ui/Panel";
import { Button } from "components/ui/Button";
import { FishName } from "features/game/types/fish";
import { SKILL_XP } from "features/game/lib/skills";

interface Props {
  fish: FishName;
  amount: number;
  onClose: () => void;
}

const XP_PER_CATCH = SKILL_XP.catch_fish;

/**
 * Result modal shown after a successful fishing cast.
 * Auto-dismisses after 4 seconds or on user interaction.
 */
export const FishCaughtModal: React.FC<Props> = ({ fish, amount, onClose }) => {
  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const totalXP = XP_PER_CATCH * amount;
  const label   = amount > 1 ? `${amount}× ${fish}` : fish;

  return (
    <Modal centered show onHide={onClose}>
      <Panel>
        <div className="flex flex-col items-center gap-3 p-2">
          <span className="text-center text-base">Nice catch!</span>

          <img
            src="/assets/fish/fish.png"
            alt={fish}
            className="w-16 h-16 img-highlight"
            style={{ imageRendering: "pixelated" }}
          />

          <span className="text-center text-sm">{label}</span>

          <span className="text-center text-xs text-yellow-300">
            +{totalXP} Fishing XP
          </span>

          <Button onClick={onClose} className="mt-1 w-32">
            Collect
          </Button>
        </div>
      </Panel>
    </Modal>
  );
};
