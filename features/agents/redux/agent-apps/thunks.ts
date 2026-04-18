/**
 * Agent Apps — Redux Thunks (scaffold; non-functional)
 *
 * These thunks are deliberately stubbed. Apps are in the plan but not yet
 * backed by a DB table / RPC surface. The signatures are defined so consumers
 * can import and wire them — every dispatched call will throw with a clear
 * "not implemented" message until the backend lands.
 *
 * When the backend ships, mirror `agent-shortcuts/thunks.ts`: each thunk calls
 * the equivalent RPC, funnels the response through a converter, and dispatches
 * into the slice via the actions exported from `./slice`.
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import type { AgentApp } from "./types";

interface ThunkApi {
  dispatch: AppDispatch;
  state: RootState;
}

const NOT_IMPLEMENTED =
  "agent-apps thunks are not yet implemented — the App feature is scaffolded but the DB surface is not ready.";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export const fetchAppsInitial = createAsyncThunk<void, void, ThunkApi>(
  "agentApp/fetchInitial",
  async () => {
    throw new Error(NOT_IMPLEMENTED);
  },
);

export const fetchAppById = createAsyncThunk<void, string, ThunkApi>(
  "agentApp/fetchById",
  async () => {
    throw new Error(NOT_IMPLEMENTED);
  },
);

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export const saveApp = createAsyncThunk<void, string, ThunkApi>(
  "agentApp/save",
  async () => {
    throw new Error(NOT_IMPLEMENTED);
  },
);

export const saveAppField = createAsyncThunk<
  void,
  { appId: string; field: keyof AgentApp; value: AgentApp[keyof AgentApp] },
  ThunkApi
>("agentApp/saveField", async () => {
  throw new Error(NOT_IMPLEMENTED);
});

export const createApp = createAsyncThunk<
  string,
  Partial<AgentApp> & { label: string },
  ThunkApi
>("agentApp/create", async () => {
  throw new Error(NOT_IMPLEMENTED);
});

export const deleteApp = createAsyncThunk<void, string, ThunkApi>(
  "agentApp/delete",
  async () => {
    throw new Error(NOT_IMPLEMENTED);
  },
);

// ---------------------------------------------------------------------------
// Composition — shortcuts embedded within an app
// ---------------------------------------------------------------------------

export const addEmbeddedShortcut = createAsyncThunk<
  void,
  { appId: string; shortcutId: string },
  ThunkApi
>("agentApp/addEmbeddedShortcut", async () => {
  throw new Error(NOT_IMPLEMENTED);
});

export const removeEmbeddedShortcut = createAsyncThunk<
  void,
  { appId: string; shortcutId: string },
  ThunkApi
>("agentApp/removeEmbeddedShortcut", async () => {
  throw new Error(NOT_IMPLEMENTED);
});
