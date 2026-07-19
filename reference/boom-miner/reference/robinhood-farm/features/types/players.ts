export interface PlayerSkills {
  farming: number;
  mining: number;
  woodcutting: number;
  fishing: number;
  husbandry: number;
}

export interface CreatePlayerInput {
  wallet: string;
  username?: string;
  referrer?: string;
}

export interface UpdatePlayerStateInput {
  username?: string;
  skills?: Partial<PlayerSkills>;
}

export interface PlayerDTO {
  wallet: string;
  username?: string;
  registrationTime: number;
  referrer?: string;
  skills: PlayerSkills;
  /** In-game coin balance. */
  coins: number;
  reputationPoints: number;
  /** Cumulative coins burned. Determines daily withdrawal ceiling. */
  stash: number;
  /** Coins already withdrawn in the current UTC day. */
  withdrawnToday: number;
  /** Unix ms of last withdrawal. 0 = never withdrawn. */
  lastWithdrawnAt: number;
}
