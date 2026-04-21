/**
 * netHealth slice — coarse connection/server health signals.
 *
 * Populated by the RequestRecoveryProvider (online/offline listeners) and
 * by `runTrackedRequest` (recent 5xx / timeout tallies). Drives the global
 * "server having trouble" banner.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface NetHealthState {
  online: boolean;
  /** Rolling count of 5xx/timeout events in the last N requests. */
  recentFailures: number;
  /** Rolling count of successful requests. */
  recentSuccesses: number;
  /** Last time a request completed (success or failure), ms. */
  lastActivityAt: number | null;
}

const initialState: NetHealthState = {
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  recentFailures: 0,
  recentSuccesses: 0,
  lastActivityAt: null,
};

const WINDOW = 20;

const slice = createSlice({
  name: "netHealth",
  initialState,
  reducers: {
    setOnline(state, action: PayloadAction<boolean>) {
      state.online = action.payload;
    },
    recordOutcome(
      state,
      action: PayloadAction<{ ok: boolean; serverError?: boolean }>,
    ) {
      const total = state.recentFailures + state.recentSuccesses;
      if (total >= WINDOW) {
        // Drop the oldest — we don't keep the list, so approximate by
        // halving counts. Good enough for a coarse banner.
        state.recentFailures = Math.floor(state.recentFailures / 2);
        state.recentSuccesses = Math.floor(state.recentSuccesses / 2);
      }
      if (action.payload.ok) state.recentSuccesses++;
      else if (action.payload.serverError !== false) state.recentFailures++;
      state.lastActivityAt = Date.now();
    },
    reset(state) {
      state.recentFailures = 0;
      state.recentSuccesses = 0;
    },
  },
});

export const { setOnline, recordOutcome, reset } = slice.actions;
export default slice.reducer;
