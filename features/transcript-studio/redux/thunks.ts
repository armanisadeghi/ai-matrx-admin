/**
 * features/transcript-studio/redux/thunks.ts
 *
 * Async thunks bridging the studio slice and Supabase via studioService.
 * Phase 1 covers session-level CRUD only.
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "sonner";
import type { ChunkCompleteInfo } from "@/features/audio/hooks/useChunkedRecordAndTranscribe";
import {
  createSession,
  deleteCleanedSegment,
  deleteConceptItem,
  deleteModuleSegment,
  deleteRawSegment,
  fetchSessionSettings,
  insertRawSegment,
  listCleanedSegments,
  listConceptItems,
  listModuleSegments,
  listRawSegments,
  listSessions,
  softDeleteSession,
  updateCleanedSegmentText,
  updateConceptItem,
  updateModuleSegmentPayload,
  updateRawSegmentText,
  updateSession,
  upsertSessionSettings,
  type ConceptItemPatch,
  type UpsertSessionSettingsInput,
} from "../service/studioService";
import type {
  CleanedSegment,
  ConceptItem,
  CreateSessionInput,
  ModuleSegment,
  RawSegment,
  SessionSettings,
  StudioSession,
  UpdateSessionInput,
} from "../types";
import {
  activeSessionIdSet,
  cleanedSegmentRemoved,
  cleanedSegmentUpdated,
  cleanedSegmentsLoaded,
  conceptItemRemoved,
  conceptItemUpdated,
  conceptsLoaded,
  moduleSegmentRemoved,
  moduleSegmentUpdated,
  moduleSegmentsLoaded,
  moduleSwitched,
  rawSegmentRemoved,
  rawSegmentUpdated,
  rawSegmentsAppended,
  rawSegmentsLoaded,
  sessionRemoved,
  sessionSettingsLoaded,
  sessionsListFailed,
  sessionsListLoaded,
  sessionsListLoading,
  sessionUpserted,
} from "./slice";

interface CreateSessionThunkArg extends CreateSessionInput {
  /** auth.users.id of the caller — passed in to avoid an extra fetch in the thunk. */
  userId: string;
  /** When true, sets the new session as active immediately. */
  activate?: boolean;
}

export const fetchSessionsThunk = createAsyncThunk<StudioSession[], void>(
  "transcriptStudio/fetchSessions",
  async (_, { dispatch, rejectWithValue }) => {
    dispatch(sessionsListLoading());
    try {
      const sessions = await listSessions();
      dispatch(sessionsListLoaded(sessions));
      return sessions;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load sessions";
      dispatch(sessionsListFailed(message));
      return rejectWithValue(message);
    }
  },
);

export const createSessionThunk = createAsyncThunk<
  StudioSession,
  CreateSessionThunkArg
>(
  "transcriptStudio/createSession",
  async (arg, { dispatch, rejectWithValue }) => {
    try {
      const { userId, activate, ...input } = arg;
      const session = await createSession(input, userId);
      dispatch(sessionUpserted(session));
      if (activate) dispatch(activeSessionIdSet(session.id));
      return session;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create session";
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const updateSessionThunk = createAsyncThunk<
  StudioSession,
  { id: string; patch: UpdateSessionInput }
>(
  "transcriptStudio/updateSession",
  async ({ id, patch }, { dispatch, rejectWithValue }) => {
    try {
      const session = await updateSession(id, patch);
      dispatch(sessionUpserted(session));
      return session;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update session";
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const deleteSessionThunk = createAsyncThunk<string, string>(
  "transcriptStudio/deleteSession",
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await softDeleteSession(id);
      dispatch(sessionRemoved(id));
      return id;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete session";
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

// ── Recording lifecycle ──────────────────────────────────────────────

export const startSessionRecordingThunk = createAsyncThunk<
  StudioSession,
  { id: string }
>(
  "transcriptStudio/startSessionRecording",
  async ({ id }, { dispatch, rejectWithValue }) => {
    try {
      const session = await updateSession(id, {
        status: "recording",
      });
      dispatch(sessionUpserted(session));
      return session;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to mark session recording";
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const stopSessionRecordingThunk = createAsyncThunk<
  StudioSession,
  { id: string; totalDurationMs: number }
>(
  "transcriptStudio/stopSessionRecording",
  async ({ id, totalDurationMs }, { dispatch, rejectWithValue }) => {
    try {
      const session = await updateSession(id, {
        status: "stopped",
        endedAt: new Date().toISOString(),
        totalDurationMs,
      });
      dispatch(sessionUpserted(session));
      return session;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to stop session";
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const fetchRawSegmentsThunk = createAsyncThunk<
  RawSegment[],
  { sessionId: string }
>(
  "transcriptStudio/fetchRawSegments",
  async ({ sessionId }, { dispatch, rejectWithValue }) => {
    try {
      const segments = await listRawSegments(sessionId);
      dispatch(rawSegmentsLoaded({ sessionId, segments }));
      return segments;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load raw segments";
      return rejectWithValue(message);
    }
  },
);

export const fetchCleanedSegmentsThunk = createAsyncThunk<
  CleanedSegment[],
  { sessionId: string }
>(
  "transcriptStudio/fetchCleanedSegments",
  async ({ sessionId }, { dispatch, rejectWithValue }) => {
    try {
      const segments = await listCleanedSegments(sessionId);
      dispatch(cleanedSegmentsLoaded({ sessionId, segments }));
      return segments;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load cleaned segments";
      return rejectWithValue(message);
    }
  },
);

/**
 * Persist a single chunk's transcription as a raw segment. Called once per
 * `onChunkComplete` from the global recording provider. Append-only: never
 * patches existing rows. Surface errors quietly via toast — losing one
 * chunk to a transient network blip should not abort the recording.
 */
// Re-export per-column pipelines so callers don't have to know which file
// each thunk lives in. The implementations live in dedicated files to keep
// this file focused on session + raw CRUD.
export { runCleaningPassThunk } from "./runCleaningPass.thunk";
export type { RunCleaningPassResult } from "./runCleaningPass.thunk";
export { runConceptPassThunk } from "./runConceptPass.thunk";
export type { RunConceptPassResult } from "./runConceptPass.thunk";
export { runModulePassThunk } from "./runModulePass.thunk";
export type { RunModulePassResult } from "./runModulePass.thunk";

export const fetchModuleSegmentsThunk = createAsyncThunk<
  ModuleSegment[],
  { sessionId: string }
>(
  "transcriptStudio/fetchModuleSegments",
  async ({ sessionId }, { dispatch, rejectWithValue }) => {
    try {
      const segments = await listModuleSegments(sessionId);
      dispatch(moduleSegmentsLoaded({ sessionId, segments }));
      return segments;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load module segments";
      return rejectWithValue(message);
    }
  },
);

// ── Session settings (Phase 8) ────────────────────────────────────────

export const fetchSessionSettingsThunk = createAsyncThunk<
  SessionSettings | null,
  { sessionId: string }
>(
  "transcriptStudio/fetchSessionSettings",
  async ({ sessionId }, { dispatch, rejectWithValue }) => {
    try {
      const settings = await fetchSessionSettings(sessionId);
      if (settings) {
        dispatch(sessionSettingsLoaded({ sessionId, settings }));
      }
      return settings;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load session settings";
      return rejectWithValue(message);
    }
  },
);

/**
 * Upsert per-session settings. Optimistically writes the supplied patch
 * into Redux first (so the UI reflects the change immediately), then
 * persists to Supabase. On failure we surface a toast and refetch to
 * restore the canonical state.
 */
export const updateSessionSettingsThunk = createAsyncThunk<
  SessionSettings,
  Omit<UpsertSessionSettingsInput, "sessionId"> & { sessionId: string }
>(
  "transcriptStudio/updateSessionSettings",
  async (input, { dispatch, rejectWithValue }) => {
    try {
      const settings = await upsertSessionSettings(input);
      dispatch(
        sessionSettingsLoaded({ sessionId: input.sessionId, settings }),
      );
      // Mid-session module switch: also flip the session row's moduleId so
      // Column 4 swaps without losing prior segments.
      if (input.moduleId !== undefined) {
        dispatch(
          moduleSwitched({
            sessionId: input.sessionId,
            moduleId: input.moduleId,
          }),
        );
      }
      return settings;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update settings";
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const fetchConceptItemsThunk = createAsyncThunk<
  ConceptItem[],
  { sessionId: string }
>(
  "transcriptStudio/fetchConceptItems",
  async ({ sessionId }, { dispatch, rejectWithValue }) => {
    try {
      const items = await listConceptItems(sessionId);
      dispatch(conceptsLoaded({ sessionId, items }));
      return items;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load concept items";
      return rejectWithValue(message);
    }
  },
);

export const ingestRawChunkThunk = createAsyncThunk<
  RawSegment,
  { sessionId: string; info: ChunkCompleteInfo }
>(
  "transcriptStudio/ingestRawChunk",
  async ({ sessionId, info }, { dispatch, rejectWithValue }) => {
    try {
      const segment = await insertRawSegment({
        sessionId,
        chunkIndex: info.chunkIndex,
        tStart: info.tStart,
        tEnd: info.tEnd,
        text: info.text,
        source: "chunk",
      });
      dispatch(rawSegmentsAppended({ sessionId, segments: [segment] }));
      return segment;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to persist transcription chunk";
      // Toast quietly; recording continues.
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

// ── Per-row edit / delete thunks ────────────────────────────────────
//
// Each thunk does an optimistic update first, persists, and reverts on
// error. The reducers (`*Updated` / `*Removed`) are idempotent, so the
// realtime middleware echoing the same change is harmless.

export const updateRawSegmentTextThunk = createAsyncThunk<
  RawSegment,
  { sessionId: string; segmentId: string; text: string }
>(
  "transcriptStudio/updateRawSegmentText",
  async ({ sessionId, segmentId, text }, { dispatch, rejectWithValue }) => {
    try {
      const updated = await updateRawSegmentText(segmentId, text);
      dispatch(rawSegmentUpdated({ sessionId, segment: updated }));
      return updated;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update raw segment";
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const deleteRawSegmentThunk = createAsyncThunk<
  void,
  { sessionId: string; segmentId: string }
>(
  "transcriptStudio/deleteRawSegment",
  async ({ sessionId, segmentId }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(rawSegmentRemoved({ sessionId, segmentId }));
      await deleteRawSegment(segmentId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete raw segment";
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const updateCleanedSegmentTextThunk = createAsyncThunk<
  CleanedSegment,
  { sessionId: string; segmentId: string; text: string }
>(
  "transcriptStudio/updateCleanedSegmentText",
  async ({ sessionId, segmentId, text }, { dispatch, rejectWithValue }) => {
    try {
      const updated = await updateCleanedSegmentText(segmentId, text);
      dispatch(cleanedSegmentUpdated({ sessionId, segment: updated }));
      return updated;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to update cleaned segment";
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const deleteCleanedSegmentThunk = createAsyncThunk<
  void,
  { sessionId: string; segmentId: string }
>(
  "transcriptStudio/deleteCleanedSegment",
  async ({ sessionId, segmentId }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(cleanedSegmentRemoved({ sessionId, segmentId }));
      await deleteCleanedSegment(segmentId);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to delete cleaned segment";
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const updateConceptItemThunk = createAsyncThunk<
  ConceptItem,
  { sessionId: string; itemId: string; patch: ConceptItemPatch }
>(
  "transcriptStudio/updateConceptItem",
  async ({ sessionId, itemId, patch }, { dispatch, rejectWithValue }) => {
    try {
      const updated = await updateConceptItem(itemId, patch);
      dispatch(conceptItemUpdated({ sessionId, item: updated }));
      return updated;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update concept";
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const deleteConceptItemThunk = createAsyncThunk<
  void,
  { sessionId: string; itemId: string }
>(
  "transcriptStudio/deleteConceptItem",
  async ({ sessionId, itemId }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(conceptItemRemoved({ sessionId, itemId }));
      await deleteConceptItem(itemId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete concept";
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const updateModuleSegmentPayloadThunk = createAsyncThunk<
  ModuleSegment,
  { sessionId: string; segmentId: string; payload: unknown }
>(
  "transcriptStudio/updateModuleSegmentPayload",
  async ({ sessionId, segmentId, payload }, { dispatch, rejectWithValue }) => {
    try {
      const updated = await updateModuleSegmentPayload(segmentId, payload);
      dispatch(moduleSegmentUpdated({ sessionId, segment: updated }));
      return updated;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update module segment";
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

export const deleteModuleSegmentThunk = createAsyncThunk<
  void,
  { sessionId: string; segmentId: string }
>(
  "transcriptStudio/deleteModuleSegment",
  async ({ sessionId, segmentId }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(moduleSegmentRemoved({ sessionId, segmentId }));
      await deleteModuleSegment(segmentId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete module segment";
      toast.error(message);
      return rejectWithValue(message);
    }
  },
);

