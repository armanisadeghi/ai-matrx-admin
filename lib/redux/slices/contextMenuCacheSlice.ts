'use client';

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ContextMenuRow } from '@/utils/supabase/ssrShellData';

export interface ContextMenuCacheState {
  rows: ContextMenuRow[];
  hydrated: boolean;
}

const initialState: ContextMenuCacheState = {
  rows: [],
  hydrated: false,
};

/**
 * Stores raw context_menu_unified_view rows fetched server-side.
 * Populated once at hydration time from the SSR shell data RPC.
 * useUnifiedContextMenu reads from here first — no client fetch needed.
 */
const contextMenuCacheSlice = createSlice({
  name: 'contextMenuCache',
  initialState,
  reducers: {
    setContextMenuRows(state, action: PayloadAction<ContextMenuRow[]>) {
      state.rows = action.payload;
      console.log("[contextMenuCacheSlice] setContextMenuRows: ", state.rows.length);
      state.hydrated = true;
    },
    clearContextMenuCache(state) {
      state.rows = [];
      state.hydrated = false;
      console.log("[contextMenuCacheSlice] clearContextMenuCache Cleared Cache");
    },
  },
});

export const { setContextMenuRows, clearContextMenuCache } = contextMenuCacheSlice.actions;

// Selectors typed against a minimal shape — compatible with both LiteRootState
// and any state that includes contextMenuCache
export const selectContextMenuRows = (state: { contextMenuCache: ContextMenuCacheState }) =>
  state.contextMenuCache.rows;

export const selectContextMenuHydrated = (state: { contextMenuCache: ContextMenuCacheState }) =>
  state.contextMenuCache.hydrated;

export default contextMenuCacheSlice.reducer;
