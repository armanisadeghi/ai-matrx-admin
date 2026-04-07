import {
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  computeGlobalArrangement,
  GlobalLayoutType,
} from "@/features/window-panels/utils/windowArrangements";

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
  /** Saved rect before minimize so restore can return to the original size */
  preMinimizedRect: WindowRect | null;
  /** z-index order — higher = on top */
  zIndex: number;
  /** Order in the minimized tray (0-based, kept for compat but unused in chip-less mode) */
  traySlot: number | null;
}

export interface WindowManagerState {
  windows: Record<string, WindowEntry>;
  /** Next z-index to assign when a window is focused */
  nextZIndex: number;
  /** How many slots are currently occupied in the tray */
  trayCount: number;
  /** Global visibility toggle — windows stay mounted but are visually hidden */
  windowsHidden: boolean;
}

// ─── Tray layout constants ────────────────────────────────────────────────────
//
// All minimized-chip placement math derives from these values.
// Change them here and every calculation updates automatically.
//
//  ┌─────────────────────────────── viewport ────────────────────────────────┐
//  │                                                                         │
//  │   [chip 4]  [chip 3]  [chip 2]  [chip 1]  [chip 0]  ← MARGIN_RIGHT    │
//  │                                                   ↕ MARGIN_BOTTOM      │
//  └─────────────────────────────────────────────────────────────────────────┘
//
//  Row 0 starts at the bottom-right. Once a row is full, row 1 opens directly
//  above it (separated by GAP_Y). Rows keep growing upward as needed.

export const TRAY_CHIP_W = 270; // px — minimized chip width
export const TRAY_CHIP_H = 100; // px — minimized chip height
export const TRAY_GAP_X = 8; // px — horizontal gap between chips
export const TRAY_GAP_Y = 8; // px — vertical gap between rows
export const TRAY_MARGIN_R = 20; // px — gap from right viewport edge
export const TRAY_MARGIN_B = 20; // px — gap from bottom viewport edge
export const TRAY_MARGIN_L = 8; // px — left boundary: don't go further left

// Chips per row given a viewport width
export function trayChipsPerRow(viewportWidth: number): number {
  const usable = viewportWidth - TRAY_MARGIN_R - TRAY_MARGIN_L;
  return Math.max(
    1,
    Math.floor((usable + TRAY_GAP_X) / (TRAY_CHIP_W + TRAY_GAP_X)),
  );
}

// Compute (x, y) for a given tray slot index and viewport dimensions
export function traySlotRect(
  slot: number,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number; width: number; height: number } {
  const perRow = trayChipsPerRow(viewportWidth);
  const col = slot % perRow; // 0 = rightmost
  const row = Math.floor(slot / perRow); // 0 = bottom row

  const x =
    viewportWidth -
    TRAY_MARGIN_R -
    TRAY_CHIP_W -
    col * (TRAY_CHIP_W + TRAY_GAP_X);

  const y =
    viewportHeight -
    TRAY_MARGIN_B -
    TRAY_CHIP_H -
    row * (TRAY_CHIP_H + TRAY_GAP_Y);

  return { x, y, width: TRAY_CHIP_W, height: TRAY_CHIP_H };
}

// ─── Base constants ───────────────────────────────────────────────────────────

const BASE_Z = 1000;
const TRAY_SLOT_WIDTH = TRAY_CHIP_W; // kept for selector compat

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: WindowManagerState = {
  windows: {},
  nextZIndex: BASE_Z,
  trayCount: 0,
  windowsHidden: false,
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
        preMinimizedRect: null,
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
      // Free tray slot
      if (win.traySlot !== null) {
        state.trayCount = Math.max(0, state.trayCount - 1);
        // Compact remaining tray slots
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
      // Recover the rect we had before minimizing (if any)
      if (win.preMinimizedRect) {
        win.windowed = win.preMinimizedRect;
        win.preMinimizedRect = null;
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

    /**
     * Minimize a window — parks it in the tray grid at the bottom of the
     * viewport. Caller must supply current viewport dimensions so the reducer
     * can compute the exact position without touching window/document.
     */
    minimizeWindow(
      state,
      action: PayloadAction<{
        id: string;
        viewportWidth: number;
        viewportHeight: number;
      }>,
    ) {
      const { id, viewportWidth, viewportHeight } = action.payload;
      const win = state.windows[id];
      if (!win || win.state === "minimized") return;

      // Save full-size rect so restore can return to it
      win.preMinimizedRect = { ...win.windowed };

      // Assign the next available tray slot and compute its position
      const slot = state.trayCount;
      win.traySlot = slot;
      state.trayCount += 1;

      win.windowed = traySlotRect(slot, viewportWidth, viewportHeight);
      win.state = "minimized";
    },

    /**
     * Minimize ALL non-minimized, non-maximized windows in one shot.
     * Use for a "collapse all" button. Caller supplies viewport dimensions.
     */
    minimizeAll(
      state,
      action: PayloadAction<{ viewportWidth: number; viewportHeight: number }>,
    ) {
      const { viewportWidth, viewportHeight } = action.payload;
      Object.values(state.windows).forEach((win) => {
        if (win.state !== "windowed") return;
        win.preMinimizedRect = { ...win.windowed };
        const slot = state.trayCount;
        win.traySlot = slot;
        state.trayCount += 1;
        win.windowed = traySlotRect(slot, viewportWidth, viewportHeight);
        win.state = "minimized";
      });
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

    /** Arranges all non-minimized windows globally */
    arrangeActiveWindows(
      state,
      action: PayloadAction<{
        layout: GlobalLayoutType;
        viewportWidth: number;
        viewportHeight: number;
        dirX?: "ltr" | "rtl";
        dirY?: "ttb" | "btt";
        primary?: "horizontal" | "vertical";
      }>,
    ) {
      const { layout, viewportWidth, viewportHeight, dirX, dirY, primary } =
        action.payload;

      // Get all non-minimized windows, sorted by zIndex newest first
      const eligibleWindows = Object.values(state.windows)
        .filter((w) => w.state === "windowed")
        .sort((a, b) => b.zIndex - a.zIndex)
        .map((w) => w.id);

      if (eligibleWindows.length === 0) return;

      const updates = computeGlobalArrangement(
        layout,
        eligibleWindows,
        viewportWidth,
        viewportHeight,
        dirX,
        dirY,
        primary,
      );

      updates.forEach(({ id, rect }) => {
        if (state.windows[id]) {
          state.windows[id].windowed = {
            ...state.windows[id].windowed,
            ...rect,
          };
        }
      });
    },

    /**
     * Recompute tray positions for all minimized windows after a viewport
     * resize. Each window keeps its existing traySlot number — only x/y/w/h
     * are recalculated. No-op if nothing is minimized.
     */
    recomputeTrayPositions(
      state,
      action: PayloadAction<{ viewportWidth: number; viewportHeight: number }>,
    ) {
      const { viewportWidth, viewportHeight } = action.payload;
      const minimized = Object.values(state.windows).filter(
        (w) => w.state === "minimized" && w.traySlot !== null,
      );
      if (minimized.length === 0) return;
      minimized.forEach((win) => {
        win.windowed = traySlotRect(
          win.traySlot!,
          viewportWidth,
          viewportHeight,
        );
      });
    },

    /**
     * Restore ALL minimized windows to their pre-minimized rects in one shot.
     * Maximized windows are left alone — only minimized ones are affected.
     */
    restoreAll(state) {
      Object.values(state.windows).forEach((win) => {
        if (win.state !== "minimized") return;
        if (win.preMinimizedRect) {
          win.windowed = win.preMinimizedRect;
          win.preMinimizedRect = null;
        }
        win.traySlot = null;
        win.state = "windowed";
        win.zIndex = state.nextZIndex++;
      });
      state.trayCount = 0;
    },

    /** Toggle global visibility of all windows (they stay mounted). */
    toggleWindowsHidden(state) {
      state.windowsHidden = !state.windowsHidden;
    },

    /** Move a minimized chip to a new tray slot (drag-within-tray). */
    moveTraySlot(state, action: PayloadAction<{ id: string; toSlot: number }>) {
      const { id, toSlot } = action.payload;
      const win = state.windows[id];
      if (!win || win.traySlot === null) return;
      const fromSlot = win.traySlot;
      // Shift other windows
      Object.values(state.windows).forEach((w) => {
        if (w.id === id || w.traySlot === null) return;
        if (
          fromSlot < toSlot &&
          w.traySlot > fromSlot &&
          w.traySlot <= toSlot
        ) {
          w.traySlot -= 1;
        } else if (
          fromSlot > toSlot &&
          w.traySlot >= toSlot &&
          w.traySlot < fromSlot
        ) {
          w.traySlot += 1;
        }
      });
      win.traySlot = toSlot;
    },

    /** Restore window geometry and state from localStorage */
    restoreWindowState(
      state,
      action: PayloadAction<Record<string, WindowEntry>>,
    ) {
      const restored = action.payload;
      // We only restore window state geometry properties, not titles or anything else
      // In case we want to overwrite, we just use a shallow copy.
      state.windows = { ...state.windows };
      let maxZ = state.nextZIndex;
      let maxTray = -1;

      Object.entries(restored).forEach(([id, win]) => {
        if (!state.windows[id]) {
          // It's possible the window isn't registered yet, we still store the hydrated state
          // but we shouldn't since it creates 'orphan' windows that aren't mounted.
          // Wait, UrlSync mounts them, WindowManager just handles their state. So restoring orphans is actually perfect
          // so when they are registered later, they overwrite this. Wait! `registerWindow` has `if (state.windows[id]) return;`
          // So if we hydrate here, and register fires later, it'll correctly no-op and keep the hydrated values!
          state.windows[id] = win;
        } else {
          // If already registered, overwrite with hydrated size
          state.windows[id] = { ...state.windows[id], ...win };
        }
        if (win.zIndex >= maxZ) maxZ = win.zIndex + 1;
        if (win.traySlot !== null && win.traySlot > maxTray)
          maxTray = win.traySlot;
      });

      state.nextZIndex = Math.max(state.nextZIndex, maxZ);
      // Wait, tray count is strictly how many are minimized.
      state.trayCount = Object.values(state.windows).filter(
        (w) => w.traySlot !== null,
      ).length;
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
  minimizeAll,
  restoreAll,
  recomputeTrayPositions,
  updateWindowRect,
  updateWindowTitle,
  toggleWindowsHidden,
  moveTraySlot,
  arrangeActiveWindows,
  restoreWindowState,
} = windowManagerSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

type StateWithWM = { windowManager: WindowManagerState };

// Raw slice accessor — used as input selector for derived selectors
const selectWindowsMap = (state: StateWithWM) => state.windowManager.windows;

export const selectWindow = (id: string) => (state: StateWithWM) =>
  state.windowManager.windows[id];

export const selectWindowState = (id: string) => (state: StateWithWM) =>
  state.windowManager.windows[id]?.state;

export const selectWindowRect = (id: string) => (state: StateWithWM) =>
  state.windowManager.windows[id]?.windowed;

export const selectWindowZIndex = (id: string) => (state: StateWithWM) =>
  state.windowManager.windows[id]?.zIndex ?? BASE_Z;

export const selectWindowTitle = (id: string) => (state: StateWithWM) =>
  state.windowManager.windows[id]?.title ?? id;

export const selectTraySlotWidth = () => TRAY_SLOT_WIDTH;

export const selectWindowsHidden = (state: StateWithWM) =>
  state.windowManager.windowsHidden;

/**
 * Minimized windows sorted by tray slot ascending.
 * Memoized — only recalculates when the windows map reference changes.
 */
export const selectTrayWindows = createSelector([selectWindowsMap], (windows) =>
  Object.values(windows)
    .filter((w) => w.state === "minimized")
    .sort((a, b) => (a.traySlot ?? 0) - (b.traySlot ?? 0)),
);

/** All registered windows sorted by zIndex descending (most-recently-focused first). */
export const selectAllWindows = createSelector([selectWindowsMap], (windows) =>
  Object.values(windows).sort((a, b) => b.zIndex - a.zIndex),
);

/** True when every registered window is minimized (or there are none). */
export const selectAllMinimized = createSelector(
  [selectWindowsMap],
  (windows) => {
    const wins = Object.values(windows);
    return wins.length > 0 && wins.every((w) => w.state === "minimized");
  },
);

export default windowManagerSlice.reducer;
