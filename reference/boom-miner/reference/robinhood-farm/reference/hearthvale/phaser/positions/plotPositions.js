/**
 * plotPositions.js
 * Farm plot tile coordinates. x/y are tile units on the Phaser map (1 tile = 16 px).
 * fieldIndex maps to FIELD_LEVEL_REQUIREMENTS in experience.ts for unlock state.
 */

export const PLOT_POSITIONS = [
  // ── Zone A (main island) ──────────────────────────────────────────────────
  { id: 'plot_01', fieldIndex:  0, x: 21, y: 4 },
  { id: 'plot_02', fieldIndex:  1, x: 22, y: 4 },
  { id: 'plot_03', fieldIndex:  2, x: 23, y: 4 },
  { id: 'plot_04', fieldIndex:  3, x: 24, y: 4 },
  { id: 'plot_05', fieldIndex:  4, x: 25, y: 4 },

  { id: 'plot_06', fieldIndex:  5, x: 20, y: 5 },
  { id: 'plot_07', fieldIndex:  6, x: 21, y: 5 },
  { id: 'plot_08', fieldIndex:  7, x: 22, y: 5 },
  { id: 'plot_09', fieldIndex:  8, x: 23, y: 5 },
  { id: 'plot_10', fieldIndex:  9, x: 24, y: 5 },
  { id: 'plot_11', fieldIndex: 10, x: 25, y: 5 },
  { id: 'plot_12', fieldIndex: 11, x: 26, y: 5 },

  { id: 'plot_13', fieldIndex: 12, x: 21, y: 6 },
  { id: 'plot_14', fieldIndex: 13, x: 22, y: 6 },

  { id: 'plot_15', fieldIndex: 14, x: 22, y: 7 },

  // ── Zone B (left island) ──────────────────────────────────────────────────
  { id: 'plot_16', fieldIndex: 15, x:  8, y: 3 },
  { id: 'plot_17', fieldIndex: 16, x:  9, y: 3 },
  { id: 'plot_18', fieldIndex: 17, x: 10, y: 3 },

  { id: 'plot_19', fieldIndex: 18, x:  7, y: 4 },
  { id: 'plot_20', fieldIndex: 19, x:  8, y: 4 },
  { id: 'plot_21', fieldIndex: 20, x:  9, y: 4 },
  { id: 'plot_22', fieldIndex: 21, x: 10, y: 4 },
  { id: 'plot_23', fieldIndex: 22, x: 11, y: 4 },

  { id: 'plot_24', fieldIndex: 23, x:  7, y: 5 },
  { id: 'plot_25', fieldIndex: 24, x:  8, y: 5 },
  { id: 'plot_26', fieldIndex: 25, x:  9, y: 5 },
  { id: 'plot_27', fieldIndex: 26, x: 10, y: 5 },
  { id: 'plot_28', fieldIndex: 27, x: 11, y: 5 },

  { id: 'plot_29', fieldIndex: 28, x:  9, y: 6 },
  { id: 'plot_30', fieldIndex: 29, x: 10, y: 6 },
]
