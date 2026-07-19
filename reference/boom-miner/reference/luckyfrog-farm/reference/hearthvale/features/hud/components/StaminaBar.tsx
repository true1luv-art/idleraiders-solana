import React, { useEffect, useState } from "react";

import { InnerPanel } from "components/ui/Panel";

import lightning from "assets/icons/lightning.png";

import { useGameStore } from "features/game/store/useGameStore";
import {
  getTimeUntilNextRegen,
  formatRegenTime,
  STAMINA_CONSTANTS,
} from "features/game/lib/stamina";

export const StaminaBar: React.FC = () => {
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  
  // Provide default values for backwards compatibility with existing saves
  const stamina = state.stamina ?? { current: 100, max: 100 };
  const lastStaminaRegenAt = state.lastStaminaRegenAt ?? Date.now();

  const [timeUntilRegen, setTimeUntilRegen] = useState<string>("");
  const [showTooltip, setShowTooltip] = useState(false);

  const percentage = stamina.max > 0 ? (stamina.current / stamina.max) * 100 : 100;

  // Check for stamina regen on mount and periodically
  useEffect(() => {
    // Trigger regen check on load
    dispatch({ type: "stamina.regenerate" });

    // Update the countdown timer
    const updateTimer = () => {
      if (stamina.current < stamina.max) {
        const timeMs = getTimeUntilNextRegen(lastStaminaRegenAt);
        setTimeUntilRegen(formatRegenTime(timeMs));
      } else {
        setTimeUntilRegen("");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    // Check for regen every minute
    const regenInterval = setInterval(() => {
      dispatch({ type: "stamina.regenerate" });
    }, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(regenInterval);
    };
  }, [dispatch, stamina.current, stamina.max, lastStaminaRegenAt]);

  // Get bar color based on stamina percentage
  const getBarColor = () => {
    if (percentage > 50) return "bg-green-500";
    if (percentage > 25) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <InnerPanel
      className="fixed top-2 right-36 z-50 flex items-center shadow-lg cursor-pointer min-w-[120px]"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <img
        src={typeof lightning === "string" ? lightning : lightning?.src}
        alt="Stamina"
        className="w-6 h-6 img-highlight"
      />
      <div className="flex flex-col ml-2 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-white text-xs text-shadow">
            {stamina.current}/{stamina.max}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getBarColor()} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-brown-200 border-2 border-brown-400 rounded-md shadow-lg z-50 min-w-[180px]">
          <p className="text-white text-xs text-shadow mb-1">
            Stamina: {stamina.current}/{stamina.max}
          </p>
          {stamina.current < stamina.max && timeUntilRegen && (
            <p className="text-white text-xxs text-shadow">
              Next +{Math.ceil(stamina.max * STAMINA_CONSTANTS.STAMINA_REGEN_PERCENT)} in {timeUntilRegen}
            </p>
          )}
          <p className="text-gray-300 text-xxs mt-1">
            Harvesting and mining costs 1 stamina
          </p>
        </div>
      )}
    </InnerPanel>
  );
};
