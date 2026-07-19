import { GameState } from "../types/game";
import { calculateStaminaRegen, STAMINA_CONSTANTS } from "../lib/stamina";

export type StaminaRegenAction = {
  type: "stamina.regenerate";
};

type Options = {
  state: GameState;
  action: StaminaRegenAction;
};

/**
 * Regenerate stamina based on time elapsed since last regen.
 * Max stamina is fixed at 100.
 */
export function staminaRegen({ state }: Options): GameState {
  const maxStamina = STAMINA_CONSTANTS.DEFAULT_MAX_STAMINA;

  const { newStamina, intervalsElapsed, newRegenAt } = calculateStaminaRegen(
    state.lastStaminaRegenAt,
    state.stamina.current,
    maxStamina
  );

  if (intervalsElapsed === 0) return state;

  return {
    ...state,
    stamina: { current: newStamina, max: maxStamina },
    lastStaminaRegenAt: newRegenAt,
  };
}
