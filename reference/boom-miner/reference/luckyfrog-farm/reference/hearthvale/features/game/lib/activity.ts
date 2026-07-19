import { GameState } from "../types/game";
import { Activity, ActivityName } from "../types/achievements";

/**
 * Track an activity by incrementing its count
 * Returns a new activity object with the updated count
 */
export function trackActivity(
  activity: Activity | undefined,
  name: ActivityName,
  amount: number = 1
): Activity {
  const currentCount = activity?.[name] ?? 0;
  return {
    ...activity,
    [name]: currentCount + amount,
  };
}

/**
 * Helper to update state with tracked activity
 */
export function withActivity(
  state: GameState,
  name: ActivityName,
  amount: number = 1
): Activity {
  return trackActivity(state.activity, name, amount);
}

/**
 * Get activity count for a specific activity
 */
export function getActivityCount(
  activity: Activity | undefined,
  name: ActivityName
): number {
  return activity?.[name] ?? 0;
}
