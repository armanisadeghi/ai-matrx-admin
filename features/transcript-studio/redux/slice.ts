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
import type {
  AgentRun,
  CleanedSegment,
  ConceptItem,
  ModuleSegment,
  RawSegment,
  StudioSession,
} from "../types";
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
  /**
   * Raw-segment registry per session, ordered by `tStart`. Append-only from
   * the application's perspective; supersession + edits live on cleaned
   * segments instead. Loaded via `listRawSegments` and appended via
   * `rawSegmentsAppended` as chunks complete.
   */
  rawById: Record<string, Record<string, RawSegment>>;
  rawIdsBySession: Record<string, string[]>;
  /**
   * Cleaned-segment registry per session. Holds ACTIVE rows only — superseded
   * rows are dropped on apply (the DB still keeps them for audit). Ordered by
   * `tStart`. Each cleaned segment is the result of one cleanup pass.
   */
  cleanedById: Record<string, Record<string, CleanedSegment>>;
  cleanedIdsBySession: Record<string, string[]>;
  /**
   * Agent-run audit registry per session. One row per agent invocation
   * (cleanup, concept extraction, module). Used by Column 2/3/4 headers to
   * surface "running"/"failed" status and by the trigger scheduler to find
   * the most recent successful pass when computing the next raw window.
   */
  runsById: Record<string, Record<string, AgentRun>>;
  runIdsBySession: Record<string, string[]>;
  /**
   * Concept-item registry per session, ordered by insertion. Append-only —
   * concept extraction passes ADD new items (never replace), so there's no
   * supersede flag here. Each pass inserts N items.
   */
  conceptsById: Record<string, Record<string, ConceptItem>>;
  conceptIdsBySession: Record<string, string[]>;
  /**
   * Module-segment registry per session, ordered by insertion. Append-only.
   * Mid-session module switches preserve existing segments tagged with their
   * original `moduleId`; the active selector filters by the session's
   * current `moduleId` unless `show_prior_modules` is enabled.
   */
  moduleSegmentsById: Record<string, Record<string, ModuleSegment>>;
  moduleSegmentIdsBySession: Record<string, string[]>;
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
  rawById: {},
  rawIdsBySession: {},
  cleanedById: {},
  cleanedIdsBySession: {},
  runsById: {},
  runIdsBySession: {},
  conceptsById: {},
  conceptIdsBySession: {},
  moduleSegmentsById: {},
  moduleSegmentIdsBySession: {},
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
    rawSegmentsLoaded(
      state,
      action: PayloadAction<{ sessionId: string; segments: RawSegment[] }>,
    ) {
      const { sessionId, segments } = action.payload;
      state.rawById[sessionId] = {};
      const ids: string[] = [];
      for (const seg of segments) {
        state.rawById[sessionId]![seg.id] = seg;
        ids.push(seg.id);
      }
      state.rawIdsBySession[sessionId] = ids;
    },
    rawSegmentsAppended(
      state,
      action: PayloadAction<{ sessionId: string; segments: RawSegment[] }>,
    ) {
      const { sessionId, segments } = action.payload;
      if (!state.rawById[sessionId]) state.rawById[sessionId] = {};
      if (!state.rawIdsBySession[sessionId]) state.rawIdsBySession[sessionId] = [];
      const ids = state.rawIdsBySession[sessionId]!;
      const byId = state.rawById[sessionId]!;
      for (const seg of segments) {
        if (byId[seg.id]) continue;          // de-duplicate (race on retry)
        byId[seg.id] = seg;
        ids.push(seg.id);
      }
      // Keep ordered by tStart — segments may arrive out-of-order on retries.
      ids.sort((a, b) => byId[a]!.tStart - byId[b]!.tStart);
    },
    rawSegmentsCleared(state, action: PayloadAction<{ sessionId: string }>) {
      delete state.rawById[action.payload.sessionId];
      delete state.rawIdsBySession[action.payload.sessionId];
    },
    cleanedSegmentsLoaded(
      state,
      action: PayloadAction<{ sessionId: string; segments: CleanedSegment[] }>,
    ) {
      const { sessionId, segments } = action.payload;
      state.cleanedById[sessionId] = {};
      const ids: string[] = [];
      for (const seg of segments) {
        state.cleanedById[sessionId]![seg.id] = seg;
        ids.push(seg.id);
      }
      state.cleanedIdsBySession[sessionId] = ids;
    },
    /**
     * Apply a cleanup-pass result. Stamps any active prior segments whose
     * tStart >= newSegment.tStart as superseded (drops them from the active
     * registry — the DB still has them for audit), then inserts the new row
     * at the right ordered position. Mirrors `applyCleanupRun` in
     * studioService.ts so client + server stay in sync.
     */
    cleanedSegmentApplied(
      state,
      action: PayloadAction<{ sessionId: string; segment: CleanedSegment }>,
    ) {
      const { sessionId, segment } = action.payload;
      if (!state.cleanedById[sessionId]) state.cleanedById[sessionId] = {};
      if (!state.cleanedIdsBySession[sessionId])
        state.cleanedIdsBySession[sessionId] = [];

      const byId = state.cleanedById[sessionId]!;
      const ids = state.cleanedIdsBySession[sessionId]!;

      // Drop active rows whose tStart >= segment.tStart (now superseded).
      const survivingIds: string[] = [];
      for (const id of ids) {
        const c = byId[id];
        if (!c) continue;
        if (c.tStart >= segment.tStart) {
          delete byId[id];
        } else {
          survivingIds.push(id);
        }
      }
      // Insert new segment.
      byId[segment.id] = segment;
      survivingIds.push(segment.id);
      survivingIds.sort((a, b) => byId[a]!.tStart - byId[b]!.tStart);
      state.cleanedIdsBySession[sessionId] = survivingIds;
    },
    cleanedSegmentsCleared(
      state,
      action: PayloadAction<{ sessionId: string }>,
    ) {
      delete state.cleanedById[action.payload.sessionId];
      delete state.cleanedIdsBySession[action.payload.sessionId];
    },
    runUpserted(state, action: PayloadAction<{ run: AgentRun }>) {
      const run = action.payload.run;
      const sid = run.sessionId;
      if (!state.runsById[sid]) state.runsById[sid] = {};
      if (!state.runIdsBySession[sid]) state.runIdsBySession[sid] = [];
      const isNew = !state.runsById[sid]![run.id];
      state.runsById[sid]![run.id] = run;
      if (isNew) state.runIdsBySession[sid]!.push(run.id);
    },
    runsLoaded(
      state,
      action: PayloadAction<{ sessionId: string; runs: AgentRun[] }>,
    ) {
      const { sessionId, runs } = action.payload;
      state.runsById[sessionId] = {};
      const ids: string[] = [];
      for (const r of runs) {
        state.runsById[sessionId]![r.id] = r;
        ids.push(r.id);
      }
      state.runIdsBySession[sessionId] = ids;
    },
    conceptsLoaded(
      state,
      action: PayloadAction<{ sessionId: string; items: ConceptItem[] }>,
    ) {
      const { sessionId, items } = action.payload;
      state.conceptsById[sessionId] = {};
      const ids: string[] = [];
      for (const it of items) {
        state.conceptsById[sessionId]![it.id] = it;
        ids.push(it.id);
      }
      state.conceptIdsBySession[sessionId] = ids;
    },
    conceptsAppended(
      state,
      action: PayloadAction<{ sessionId: string; items: ConceptItem[] }>,
    ) {
      const { sessionId, items } = action.payload;
      if (!state.conceptsById[sessionId]) state.conceptsById[sessionId] = {};
      if (!state.conceptIdsBySession[sessionId])
        state.conceptIdsBySession[sessionId] = [];
      const byId = state.conceptsById[sessionId]!;
      const ids = state.conceptIdsBySession[sessionId]!;
      for (const it of items) {
        if (byId[it.id]) continue;
        byId[it.id] = it;
        ids.push(it.id);
      }
    },
    conceptsCleared(state, action: PayloadAction<{ sessionId: string }>) {
      delete state.conceptsById[action.payload.sessionId];
      delete state.conceptIdsBySession[action.payload.sessionId];
    },
    moduleSegmentsLoaded(
      state,
      action: PayloadAction<{ sessionId: string; segments: ModuleSegment[] }>,
    ) {
      const { sessionId, segments } = action.payload;
      state.moduleSegmentsById[sessionId] = {};
      const ids: string[] = [];
      for (const s of segments) {
        state.moduleSegmentsById[sessionId]![s.id] = s;
        ids.push(s.id);
      }
      state.moduleSegmentIdsBySession[sessionId] = ids;
    },
    moduleSegmentsAppended(
      state,
      action: PayloadAction<{ sessionId: string; segments: ModuleSegment[] }>,
    ) {
      const { sessionId, segments } = action.payload;
      if (!state.moduleSegmentsById[sessionId])
        state.moduleSegmentsById[sessionId] = {};
      if (!state.moduleSegmentIdsBySession[sessionId])
        state.moduleSegmentIdsBySession[sessionId] = [];
      const byId = state.moduleSegmentsById[sessionId]!;
      const ids = state.moduleSegmentIdsBySession[sessionId]!;
      for (const s of segments) {
        if (byId[s.id]) continue;
        byId[s.id] = s;
        ids.push(s.id);
      }
    },
    moduleSegmentsCleared(
      state,
      action: PayloadAction<{ sessionId: string }>,
    ) {
      delete state.moduleSegmentsById[action.payload.sessionId];
      delete state.moduleSegmentIdsBySession[action.payload.sessionId];
    },
    moduleSwitched(
      state,
      action: PayloadAction<{ sessionId: string; moduleId: string }>,
    ) {
      const { sessionId, moduleId } = action.payload;
      const session = state.byId[sessionId];
      if (session) session.moduleId = moduleId;
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
  rawSegmentsLoaded,
  rawSegmentsAppended,
  rawSegmentsCleared,
  cleanedSegmentsLoaded,
  cleanedSegmentApplied,
  cleanedSegmentsCleared,
  runUpserted,
  runsLoaded,
  conceptsLoaded,
  conceptsAppended,
  conceptsCleared,
  moduleSegmentsLoaded,
  moduleSegmentsAppended,
  moduleSegmentsCleared,
  moduleSwitched,
} = slice.actions;

export default slice.reducer;
