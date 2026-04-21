/**
 * netRequests slice — authoritative registry of in-flight HTTP/stream requests.
 *
 * Every outbound call that goes through `runTrackedRequest` registers here
 * on start, emits phase + lastEventAt updates while running, and finalizes
 * to `completed` / `error` / `timed-out` / `cancelled`. The UI subscribes
 * to this slice to show connection-aware loading states, error cards with
 * Retry buttons, and stale-stream warnings.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type NetRequestKind =
  | "agent-run"
  | "agent-init"
  | "chat"
  | "crud"
  | "api";

export type NetRequestPhase =
  | "connecting"
  | "streaming"
  | "heartbeat-stalled"
  | "completed"
  | "error"
  | "timed-out"
  | "cancelled";

export interface NetRequest {
  id: string;
  kind: NetRequestKind;
  label: string;
  startedAt: number;
  lastEventAt: number;
  phase: NetRequestPhase;
  errorCode?: string;
  errorMessage?: string;
  /** Links to a PayloadRecord.id in IndexedDB, if the request was guarded. */
  recoveryId?: string;
  /** True if the user can safely retry this request as-is. */
  retryable: boolean;
  /** For grouping — e.g. `conversationId` for agent-run requests. */
  groupKey?: string;
}

export interface NetRequestsState {
  byId: Record<string, NetRequest>;
  /** Recent completed/failed requests, newest first. Capped to MAX_HISTORY. */
  history: string[];
}

const MAX_HISTORY = 50;

const initialState: NetRequestsState = {
  byId: {},
  history: [],
};

const slice = createSlice({
  name: "netRequests",
  initialState,
  reducers: {
    startRequest(
      state,
      action: PayloadAction<{
        id: string;
        kind: NetRequestKind;
        label: string;
        recoveryId?: string;
        groupKey?: string;
      }>,
    ) {
      const now = Date.now();
      const { id, kind, label, recoveryId, groupKey } = action.payload;
      state.byId[id] = {
        id,
        kind,
        label,
        startedAt: now,
        lastEventAt: now,
        phase: "connecting",
        recoveryId,
        retryable: true,
        groupKey,
      };
    },

    setPhase(
      state,
      action: PayloadAction<{
        id: string;
        phase: NetRequestPhase;
      }>,
    ) {
      const entry = state.byId[action.payload.id];
      if (!entry) return;
      entry.phase = action.payload.phase;
      entry.lastEventAt = Date.now();
    },

    beatHeartbeat(state, action: PayloadAction<string>) {
      const entry = state.byId[action.payload];
      if (!entry) return;
      entry.lastEventAt = Date.now();
      if (entry.phase === "heartbeat-stalled") {
        entry.phase = "streaming";
      }
    },

    finishRequest(
      state,
      action: PayloadAction<{
        id: string;
        phase: "completed" | "error" | "timed-out" | "cancelled";
        errorCode?: string;
        errorMessage?: string;
        retryable?: boolean;
      }>,
    ) {
      const entry = state.byId[action.payload.id];
      if (!entry) return;
      entry.phase = action.payload.phase;
      entry.lastEventAt = Date.now();
      if (action.payload.errorCode !== undefined)
        entry.errorCode = action.payload.errorCode;
      if (action.payload.errorMessage !== undefined)
        entry.errorMessage = action.payload.errorMessage;
      if (action.payload.retryable !== undefined)
        entry.retryable = action.payload.retryable;

      state.history = [
        action.payload.id,
        ...state.history.filter((id) => id !== action.payload.id),
      ].slice(0, MAX_HISTORY);
    },

    removeRequest(state, action: PayloadAction<string>) {
      delete state.byId[action.payload];
      state.history = state.history.filter((id) => id !== action.payload);
    },

    clearCompleted(state) {
      for (const [id, entry] of Object.entries(state.byId)) {
        if (
          entry.phase === "completed" ||
          entry.phase === "error" ||
          entry.phase === "timed-out" ||
          entry.phase === "cancelled"
        ) {
          delete state.byId[id];
        }
      }
    },
  },
});

export const {
  startRequest,
  setPhase,
  beatHeartbeat,
  finishRequest,
  removeRequest,
  clearCompleted,
} = slice.actions;

export default slice.reducer;
