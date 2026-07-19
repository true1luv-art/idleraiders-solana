/**
 * Onboarding helper for new farms
 * 
 * NOTE: Phase 3 stub - the auth machine was removed. 
 * In offline mode, we default to not showing the tutorial since there's
 * no CREATE_FARM event from the blockchain.
 */

export function isNewFarm() {
  // In offline mode without auth, default to false
  // Could be replaced with localStorage check in Phase 5
  return false;
}
