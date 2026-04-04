import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WindowState = "windowed" | "maximized" | "minimized";

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowEntry {
  id: string;
  title: string;
  state: WindowState;
  /** Last windowed size/position — restored when coming back from max/min */
  windowed: WindowRect;
  /** Position of the minimized chip — defaults to bottom-right, draggable */
  minimized: { x: number; y: number };
  /** z-index order — higher = on top */
  zIndex: number;
  /** Order in the minimized tray (0-based, kept for compat but not used for layout) */
  traySlot: number | null;
}

export interface WindowManagerState {
  windows: Record<string, WindowEntry>;
  /** Next z-index to assign when a window is focused */
  nextZIndex: number;
  /** How many slots are currently occupied in the tray */
  trayCount: number;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const BASE_Z = 1000;
const TRAY_SLOT_WIDTH = 210; // px, matches chip width

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Default bottom-right position for a chip, staggered by slot index */
function defaultMinimizedPos(slot: number): { x: number; y: number } {
  const chipW = TRAY_SLOT_WIDTH;
  const chipGap = 8;
  const bottom = 12;
  const right = 12 + slot * (chipW + chipGap);
  // We don't have window dimensions here, so use a safe large value offset
  // The component clamps on first render if needed.
  return { x: -(right + chipW), y: -(bottom + 64) };
}

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: WindowManagerState = {
  windows: {},
  nextZIndex: BASE_Z,
  trayCount: 0,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const windowManagerSlice = createSlice({
  name: "windowManager",
  initialState,
  reducers: {
    /** Register a new window. Idempotent — ignored if id already exists. */
    registerWindow(
      state,
      action: PayloadAction<{
        id: string;
        title?: string;
        initial: WindowRect;
      }>,
    ) {
      const { id, title, initial } = action.payload;
      if (state.windows[id]) return;
      state.windows[id] = {
        id,
        title: title ?? id,
        state: "windowed",
        windowed: initial,
        minimized: { x: 0, y: 0 }, // will be set properly on first minimize
        zIndex: state.nextZIndex++,
        traySlot: null,
      };
    },

    /** Update just the title (e.g. when prop changes). */
    updateWindowTitle(
      state,
      action: PayloadAction<{ id: string; title: string }>,
    ) {
      const win = state.windows[action.payload.id];
      if (win) win.title = action.payload.title;
    },

    /** Remove a window from tracking entirely. */
    unregisterWindow(state, action: PayloadAction<string>) {
      const win = state.windows[action.payload];
      if (!win) return;
      if (win.traySlot !== null) {
        state.trayCount = Math.max(0, state.trayCount - 1);
        Object.values(state.windows).forEach((w) => {
          if (w.traySlot !== null && w.traySlot > win.traySlot!) {
            w.traySlot -= 1;
          }
        });
      }
      delete state.windows[action.payload];
    },

    /** Bring a window to the top of the z stack. */
    focusWindow(state, action: PayloadAction<string>) {
      const win = state.windows[action.payload];
      if (!win) return;
      win.zIndex = state.nextZIndex++;
    },

    /** Switch to windowed (restore) state. */
    restoreWindow(state, action: PayloadAction<string>) {
      const win = state.windows[action.payload];
      if (!win) return;
      if (win.traySlot !== null) {
        state.trayCount = Math.max(0, state.trayCount - 1);
        Object.values(state.windows).forEach((w) => {
          if (w.traySlot !== null && w.traySlot > win.traySlot!) {
            w.traySlot -= 1;
          }
        });
        win.traySlot = null;
      }
      win.state = "windowed";
      win.zIndex = state.nextZIndex++;
    },

    /** Switch to maximized state. */
    maximizeWindow(state, action: PayloadAction<string>) {
      const win = state.windows[action.payload];
      if (!win) return;
      if (win.traySlot !== null) {
        state.trayCount = Math.max(0, state.trayCount - 1);
        Object.values(state.windows).forEach((w) => {
          if (w.traySlot !== null && w.traySlot > win.traySlot!) {
            w.traySlot -= 1;
          }
        });
        win.traySlot = null;
      }
      win.state = "maximized";
      win.zIndex = state.nextZIndex++;
    },

    /** Switch to minimized state — assigns a tray slot and sets initial chip position. */
    minimizeWindow(state, action: PayloadAction<string>) {
      const win = state.windows[action.payload];
      if (!win || win.state === "minimized") return;
      win.traySlot = state.trayCount;
      // Set default chip position (bottom-right, staggered by slot)
      win.minimized = defaultMinimizedPos(state.trayCount);
      state.trayCount += 1;
      win.state = "minimized";
    },

    /** Update the windowed rect (called during drag or resize). */
    updateWindowRect(
      state,
      action: PayloadAction<{ id: string; rect: Partial<WindowRect> }>,
    ) {
      const win = state.windows[action.payload.id];
      if (!win) return;
      win.windowed = { ...win.windowed, ...action.payload.rect };
    },

    /** Update the minimized chip position (drag while minimized). */
    updateMinimizedPos(
      state,
      action: PayloadAction<{ id: string; x: number; y: number }>,
    ) {
      const win = state.windows[action.payload.id];
      if (!win) return;
      win.minimized = { x: action.payload.x, y: action.payload.y };
    },

    /** Move a minimized chip to a new tray slot (kept for compat). */
    moveTraySlot(state, action: PayloadAction<{ id: string; toSlot: number }>) {
      const { id, toSlot } = action.payload;
      const win = state.windows[id];
      if (!win || win.traySlot === null) return;
      const fromSlot = win.traySlot;
      Object.values(state.windows).forEach((w) => {
        if (w.id === id || w.traySlot === null) return;
        if (fromSlot < toSlot && w.traySlot > fromSlot && w.traySlot <= toSlot) {
          w.traySlot -= 1;
        } else if (fromSlot > toSlot && w.traySlot >= toSlot && w.traySlot < fromSlot) {
          w.traySlot += 1;
        }
      });
      win.traySlot = toSlot;
    },
  },
});

export const {
  registerWindow,
  unregisterWindow,
  focusWindow,
  restoreWindow,
  maximizeWindow,
  minimizeWindow,
  updateWindowRect,
  updateMinimizedPos,
  updateWindowTitle,
  moveTraySlot,
} = windowManagerSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

type StateWithWM = { windowManager: WindowManagerState };

export const selectWindow = (id: string) => (state: StateWithWM) =>
  state.windowManager.windows[id] ?? null;

export const selectWindowState = (id: string) => (state: StateWithWM) =>
  state.windowManager.windows[id]?.state ?? "windowed";

export const selectWindowRect = (id: string) => (state: StateWithWM) =>
  state.windowManager.windows[id]?.windowed ?? null;

export const selectWindowZIndex = (id: string) => (state: StateWithWM) =>
  state.windowManager.windows[id]?.zIndex ?? BASE_Z;

export const selectWindowTitle = (id: string) => (state: StateWithWM) =>
  state.windowManager.windows[id]?.title ?? id;

export const selectTrayWindows = (state: StateWithWM) =>
  Object.values(state.windowManager.windows)
    .filter((w) => w.state === "minimized")
    .sort((a, b) => (a.traySlot ?? 0) - (b.traySlot ?? 0));

export const selectTraySlotWidth = () => TRAY_SLOT_WIDTH;

export default windowManagerSlice.reducer;
