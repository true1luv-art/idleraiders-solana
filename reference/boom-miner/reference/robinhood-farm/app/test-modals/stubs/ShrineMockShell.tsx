"use client";

/**
 * app/test-modals/stubs/ShrineMockShell.tsx
 *
 * Wraps ShrineBankModal in a mock PlayerProvider so the Deposit / Withdraw /
 * Burn tabs render with plausible data without hitting real APIs.
 */

import { PlayerProvider }   from "@/context/PlayerContext";
import { ShrineBankModal }  from "@/features/game-components/shrine/ShrineBankModal";
import { MOCK_WALLET }      from "@/app/test-modals/mockup-data";

const MOCK_PLAYER = {
  username: "FarmerTest",
  wallet:   MOCK_WALLET,
  coins:    4200,
  sol:      0,
};

interface Props {
  open:    boolean;
  onClose: () => void;
}

export function ShrineMockShell({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <PlayerProvider initialPlayer={MOCK_PLAYER}>
      <ShrineBankModal open onClose={onClose} />
    </PlayerProvider>
  );
}
