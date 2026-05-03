/**
 * features/transcript-studio/redux/slice.ts
 *
 * RTK slice for the transcript studio. Phase 1 keeps it minimal:
 *   - sessions registry (byId)
 *   - activeSessionId pointer
 *   - per-session UI ephemerals (autoscroll, cursor time, leader column,
 *     settings drawer state)
 *
 * Subsequent phases will add per-column buffers (raw/cleaned/concepts/module),
 * per-session settings, and run state. Those live in the same slice (the
 * sync-scroll selector needs them in lock-step) but in dedicated sub-trees
 * so each column's selectors stay tight.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { StudioSession } from "../types";
import type { ColumnId } from "../constants";

// ── State shape ───────────────────────────────────────────────────────

export interface StudioUiState {
  activeColumn: ColumnId;
  autoscrollEnabled: boolean;
  leaderColumn: ColumnId | null;
  cursorTime: number; // session-relative seconds
  settingsOpen: boolean;
}

export interface TranscriptStudioState {
  byId: Record<string, StudioSession>;
  activeSessionId: string | null;
  /** "loading" while the initial list fetch is in flight; "ready" once done. */
  fetchStatus: "idle" | "loading" | "ready" | "error";
  fetchError: string | null;
  /** Per-session ephemeral UI state — never round-trips to Supabase. */
  ui: Record<string, StudioUiState>;
}

const DEFAULT_UI: StudioUiState = {
  activeColumn: 1,
  autoscrollEnabled: true,
  leaderColumn: null,
  cursorTime: 0,
  settingsOpen: false,
};

const initialState: TranscriptStudioState = {
  byId: {},
  activeSessionId: null,
  fetchStatus: "idle",
  fetchError: null,
  ui: {},
};

// ── Slice ─────────────────────────────────────────────────────────────

const slice = createSlice({
  name: "transcriptStudio",
  initialState,
  reducers: {
    sessionsListLoading(state) {
      state.fetchStatus = "loading";
      state.fetchError = null;
    },
    sessionsListLoaded(state, action: PayloadAction<StudioSession[]>) {
      state.fetchStatus = "ready";
      state.fetchError = null;
      // Replace registry so deleted sessions vanish on refresh, but
      // preserve any optimistic in-flight rows that haven't shipped yet
      // (those won't be present in the fetched list).
      state.byId = {};
      for (const s of action.payload) state.byId[s.id] = s;
    },
    sessionsListFailed(state, action: PayloadAction<string>) {
      state.fetchStatus = "error";
      state.fetchError = action.payload;
    },
    sessionUpserted(state, action: PayloadAction<StudioSession>) {
      const s = action.payload;
      state.byId[s.id] = s;
      if (!state.ui[s.id]) state.ui[s.id] = { ...DEFAULT_UI };
    },
    sessionRemoved(state, action: PayloadAction<string>) {
      const id = action.payload;
      delete state.byId[id];
      delete state.ui[id];
      if (state.activeSessionId === id) state.activeSessionId = null;
    },
    activeSessionIdSet(state, action: PayloadAction<string | null>) {
      const id = action.payload;
      state.activeSessionId = id;
      if (id && !state.ui[id]) state.ui[id] = { ...DEFAULT_UI };
    },
    cursorTimeChanged(
      state,
      action: PayloadAction<{
        sessionId: string;
        t: number;
        fromColumn: ColumnId;
      }>,
    ) {
      const { sessionId, t, fromColumn } = action.payload;
      const ui = state.ui[sessionId] ?? { ...DEFAULT_UI };
      ui.cursorTime = t;
      ui.leaderColumn = fromColumn;
      state.ui[sessionId] = ui;
    },
    leaderColumnReleased(state, action: PayloadAction<{ sessionId: string }>) {
      const ui = state.ui[action.payload.sessionId];
      if (ui) ui.leaderColumn = null;
    },
    autoscrollToggled(
      state,
      action: PayloadAction<{ sessionId: string; enabled: boolean }>,
    ) {
      const { sessionId, enabled } = action.payload;
      const ui = state.ui[sessionId] ?? { ...DEFAULT_UI };
      ui.autoscrollEnabled = enabled;
      state.ui[sessionId] = ui;
    },
    settingsToggled(
      state,
      action: PayloadAction<{ sessionId: string; open: boolean }>,
    ) {
      const { sessionId, open } = action.payload;
      const ui = state.ui[sessionId] ?? { ...DEFAULT_UI };
      ui.settingsOpen = open;
      state.ui[sessionId] = ui;
    },
  },
});

export const {
  sessionsListLoading,
  sessionsListLoaded,
  sessionsListFailed,
  sessionUpserted,
  sessionRemoved,
  activeSessionIdSet,
  cursorTimeChanged,
  leaderColumnReleased,
  autoscrollToggled,
  settingsToggled,
} = slice.actions;

export default slice.reducer;
