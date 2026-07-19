import React, { useState } from "react";

import { useGameStore } from "features/game/store/useGameStore";
import Decimal from "decimal.js-light";

/**
 * Inline coin balance — no panel, no fixed positioning.
 * Intended to be embedded directly inside PlayerHud below the stamina bar.
 */
export const Balance: React.FC = () => {
  const balance = useGameStore((s) => s.state.balance);
  const [isShown, setIsShown] = useState(false);

  return (
    <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5">
      <img
        src="/assets/icons/token.gif"
        alt="coin"
        className="w-3.5 h-3.5 sm:w-5 sm:h-5 img-highlight flex-shrink-0"
      />
      <span
        className="text-white font-bold text-xs sm:text-sm text-outline tabular-nums cursor-default select-none leading-none"
        onMouseEnter={() => setIsShown(true)}
        onMouseLeave={() => setIsShown(false)}
      >
        {isShown === false ? (
          new Decimal(balance)
            .toDecimalPlaces(0, Decimal.ROUND_DOWN)
            .toString()
        ) : (
          <small>{new Decimal(balance).toString()}</small>
        )}
      </span>
    </div>
  );
};
