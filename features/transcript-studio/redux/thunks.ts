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
  insertRawSegment,
  listCleanedSegments,
  listRawSegments,
  listSessions,
  softDeleteSession,
  updateSession,
} from "../service/studioService";
import type {
  CleanedSegment,
  CreateSessionInput,
  RawSegment,
  StudioSession,
  UpdateSessionInput,
} from "../types";
import {
  activeSessionIdSet,
  cleanedSegmentsLoaded,
  rawSegmentsAppended,
  rawSegmentsLoaded,
  sessionRemoved,
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
// Re-export the cleanup pipeline so callers don't have to know which file
// each thunk lives in. The actual implementation lives in
// `runCleaningPass.thunk.ts` to keep this file focused on session + raw CRUD.
export { runCleaningPassThunk } from "./runCleaningPass.thunk";
export type { RunCleaningPassResult } from "./runCleaningPass.thunk";

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
