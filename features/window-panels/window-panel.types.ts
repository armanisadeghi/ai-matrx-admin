// features/window-panels/window-panel.types.ts
//
// Primitive geometry / state types for the window-panel system.
// Kept in a dedicated file so both the Redux slice (windowManagerSlice)
// and utility modules (windowArrangements) can import from here without
// creating a cycle between the slice and feature utilities.

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
