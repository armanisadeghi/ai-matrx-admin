// lib/redux/slices/overlayDataSlice.ts
//
// Dynamic key-value store for overlay-specific structured state.
//
// Purpose: Overlays that need richer, mutable state beyond the simple open/close
// + small data blob in overlaySlice can store that state here. Entries are keyed
// by a composite key: "overlayId:instanceId". The default instanceId is 'default',
// preserving full backwards-compatibility for all existing callers.
//
// Key helper:
//   overlayDataKey('htmlPreview')              → 'htmlPreview:default'
//   overlayDataKey('htmlPreview', 'my-uuid')   → 'htmlPreview:my-uuid'
//
// Usage (singleton — unchanged):
//   dispatch(setOverlayData({ overlayId: 'htmlPreview', type: 'htmlPreview', data: { ... } }));
//   const entry = useAppSelector(state => selectOverlayData(state, 'htmlPreview'));
//
// Usage (instanced — new):
//   dispatch(setOverlayData({ overlayId: 'htmlPreview', instanceId: 'uuid', type: 'htmlPreview', data: { ... } }));
//   const entry = useAppSelector(state => selectOverlayData(state, 'htmlPreview', 'uuid'));
//
// Registered in rootReducer (single app-wide store).
// This slice was previously duplicated in the deprecated lite root reducer so it is
// available in all routes (authenticated, SSR shell, and public).

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { DEFAULT_INSTANCE_ID } from "./overlaySlice";

// ============================================================================
// KEY HELPER
// ============================================================================

/** Composite key used as the map key in this slice's entries. */
export const overlayDataKey = (
  overlayId: string,
  instanceId: string = DEFAULT_INSTANCE_ID,
): string => `${overlayId}:${instanceId}`;

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
  instanceId?: string;
  type: string;
  data: T;
}

interface UpdateOverlayDataPayload {
  overlayId: string;
  instanceId?: string;
  updates: Record<string, unknown>;
}

interface ClearOverlayDataPayload {
  overlayId: string;
  instanceId?: string;
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
      const { overlayId, instanceId, type, data } = action.payload;
      const key = overlayDataKey(overlayId, instanceId);
      state.entries[key] = {
        type,
        data,
        updatedAt: Date.now(),
      };
    },

    updateOverlayData(
      state: OverlayDataState,
      action: PayloadAction<UpdateOverlayDataPayload>,
    ) {
      const { overlayId, instanceId, updates } = action.payload;
      const key = overlayDataKey(overlayId, instanceId);
      const entry = state.entries[key];
      if (!entry) return;
      Object.assign(entry.data as Record<string, unknown>, updates);
      entry.updatedAt = Date.now();
    },

    clearOverlayData(
      state: OverlayDataState,
      action: PayloadAction<ClearOverlayDataPayload>,
    ) {
      const { overlayId, instanceId } = action.payload;
      const key = overlayDataKey(overlayId, instanceId);
      delete state.entries[key];
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
 * Returns the raw entry for overlayId + instanceId (defaults to 'default').
 */
export const selectOverlayData = (
  state: StateWithOverlayData,
  overlayId: string,
  instanceId?: string,
): OverlayDataEntry | undefined =>
  state.overlayData.entries[overlayDataKey(overlayId, instanceId)];

/**
 * Type-safe selector. Returns `data as T` only when the stored type discriminator
 * matches the expected type string. Returns null otherwise (stale data guard).
 */
export function selectTypedOverlayData<T>(
  state: StateWithOverlayData,
  overlayId: string,
  type: string,
  instanceId?: string,
): T | null {
  const entry =
    state.overlayData.entries[overlayDataKey(overlayId, instanceId)];
  if (!entry || entry.type !== type) return null;
  return entry.data as T;
}
