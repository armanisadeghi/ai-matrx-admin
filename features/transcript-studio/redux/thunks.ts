/**
 * features/transcript-studio/redux/thunks.ts
 *
 * Async thunks bridging the studio slice and Supabase via studioService.
 * Phase 1 covers session-level CRUD only.
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "sonner";
import {
  createSession,
  listSessions,
  softDeleteSession,
  updateSession,
} from "../service/studioService";
import type {
  CreateSessionInput,
  StudioSession,
  UpdateSessionInput,
} from "../types";
import {
  activeSessionIdSet,
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
