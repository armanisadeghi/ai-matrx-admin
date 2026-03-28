// lib/redux/slices/overlayDataSlice.ts
//
// Dynamic key-value store for overlay-specific state.
//
// Purpose: Some overlays need more than the simple open/close + small data blob
// that overlaySlice provides. This slice stores structured, mutable state objects
// keyed by overlayId. Each entry includes a type discriminator so that components
// can verify they are reading the correct shape before rendering.
//
// Usage:
//   dispatch(setOverlayData({ overlayId: 'htmlPreview', type: 'htmlPreview', data: { ... } }));
//   const entry = useAppSelector(state => selectOverlayData(state, 'htmlPreview'));
//
// This slice is registered in both rootReducer and liteRootReducer so it is
// available in all routes (authenticated, SSR shell, and public).

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// ============================================================================
// TYPES
// ============================================================================

export interface OverlayDataEntry<T = unknown> {
  type: string;
  data: T;
  updatedAt: number;
}

export interface OverlayDataState {
  entries: Record<string, OverlayDataEntry>;
}

interface SetOverlayDataPayload<T = unknown> {
  overlayId: string;
  type: string;
  data: T;
}

interface UpdateOverlayDataPayload {
  overlayId: string;
  updates: Record<string, unknown>;
}

interface ClearOverlayDataPayload {
  overlayId: string;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: OverlayDataState = {
  entries: {},
};

// ============================================================================
// SLICE
// ============================================================================

const overlayDataSlice = createSlice({
  name: "overlayData",
  initialState,
  reducers: {
    setOverlayData<T>(
      state: OverlayDataState,
      action: PayloadAction<SetOverlayDataPayload<T>>,
    ) {
      const { overlayId, type, data } = action.payload;
      state.entries[overlayId] = {
        type,
        data,
        updatedAt: Date.now(),
      };
    },

    updateOverlayData(
      state: OverlayDataState,
      action: PayloadAction<UpdateOverlayDataPayload>,
    ) {
      const { overlayId, updates } = action.payload;
      const entry = state.entries[overlayId];
      if (!entry) return;
      Object.assign(entry.data as Record<string, unknown>, updates);
      entry.updatedAt = Date.now();
    },

    clearOverlayData(
      state: OverlayDataState,
      action: PayloadAction<ClearOverlayDataPayload>,
    ) {
      delete state.entries[action.payload.overlayId];
    },
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export const { setOverlayData, updateOverlayData, clearOverlayData } =
  overlayDataSlice.actions;
export const overlayDataReducer = overlayDataSlice.reducer;
export default overlayDataSlice.reducer;

// ============================================================================
// SELECTORS
// ============================================================================

type StateWithOverlayData = { overlayData: OverlayDataState };

/**
 * Returns the raw entry for an overlayId, or undefined if not set.
 */
export const selectOverlayData = (
  state: StateWithOverlayData,
  overlayId: string,
): OverlayDataEntry | undefined => state.overlayData.entries[overlayId];

/**
 * Type-safe selector. Returns `data as T` only when the stored type discriminator
 * matches the expected type string. Returns null otherwise (stale data guard).
 */
export function selectTypedOverlayData<T>(
  state: StateWithOverlayData,
  overlayId: string,
  type: string,
): T | null {
  const entry = state.overlayData.entries[overlayId];
  if (!entry || entry.type !== type) return null;
  return entry.data as T;
}
