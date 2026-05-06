// features/idle-mischief/state/idleMischiefSlice.ts
//
// RTK slice — minimal state for the orchestrator + diagnostic surface.
//   currentAct        : which act is playing (null = nothing)
//   status            : "idle" | "playing" | "snapping-back"
//   manualTrigger     : monotonically increasing nonce; bumped to force a re-fire
//   settings          : speed / loop / enabled (dev panel writes these)
//   log               : ring buffer of recent activity + errors (max 50)
//   lastRestoreStats  : snap-back counters from the most recent restoreAll()
//   popoverDismissed  : admin closed the diagnostics popover; auto-resets to
//                       false on next trigger so the popover reappears for the
//                       next show

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MischiefActId, MischiefStatus, MischiefSettings } from "../types";

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  ts: number;
  level: LogLevel;
  message: string;
}

export interface RestoreStats {
  cleanups: number;
  portals: number;
  snapshots: number;
  sweptClones: number;
  sweptOriginals: number;
  ts: number;
}

export interface IdleMischiefState {
  status: MischiefStatus;
  currentAct: MischiefActId | null;
  manualTrigger: { actId: MischiefActId | null; nonce: number };
  settings: MischiefSettings;
  log: LogEntry[];
  lastRestoreStats: RestoreStats | null;
  popoverDismissed: boolean;
}

const MAX_LOG_ENTRIES = 50;
let nextLogId = 0;

const initialState: IdleMischiefState = {
  status: "idle",
  currentAct: null,
  manualTrigger: { actId: null, nonce: 0 },
  settings: {
    enabled: true,
    speed: 1,
    loop: false,
  },
  log: [],
  lastRestoreStats: null,
  // Start dismissed — popover only appears the first time mischief actually
  // fires, then stays until the admin closes it.
  popoverDismissed: true,
};

const slice = createSlice({
  name: "idleMischief",
  initialState,
  reducers: {
    setStatus(state, action: PayloadAction<MischiefStatus>) {
      state.status = action.payload;
    },
    setCurrentAct(state, action: PayloadAction<MischiefActId | null>) {
      state.currentAct = action.payload;
    },
    triggerAct(state, action: PayloadAction<MischiefActId>) {
      state.manualTrigger = {
        actId: action.payload,
        nonce: state.manualTrigger.nonce + 1,
      };
      // Any new trigger un-dismisses the popover so the admin sees the show.
      state.popoverDismissed = false;
    },
    requestSnapBack(state) {
      state.status = "snapping-back";
    },
    setSettings(
      state,
      action: PayloadAction<Partial<MischiefSettings>>,
    ) {
      state.settings = { ...state.settings, ...action.payload };
    },
    pushLog(
      state,
      action: PayloadAction<{ level: LogLevel; message: string }>,
    ) {
      const entry: LogEntry = {
        id: `${Date.now()}-${nextLogId++}`,
        ts: Date.now(),
        level: action.payload.level,
        message: action.payload.message,
      };
      // Newest first, capped.
      state.log.unshift(entry);
      if (state.log.length > MAX_LOG_ENTRIES) {
        state.log.length = MAX_LOG_ENTRIES;
      }
    },
    clearLog(state) {
      state.log = [];
    },
    setRestoreStats(state, action: PayloadAction<RestoreStats>) {
      state.lastRestoreStats = action.payload;
    },
    setPopoverDismissed(state, action: PayloadAction<boolean>) {
      state.popoverDismissed = action.payload;
    },
    /**
     * Called by the orchestrator when an act actually starts firing.
     * Un-dismisses the popover so the admin sees the show.
     */
    showStarted(state) {
      state.popoverDismissed = false;
    },
  },
});

export const {
  setStatus,
  setCurrentAct,
  triggerAct,
  requestSnapBack,
  setSettings,
  pushLog,
  clearLog,
  setRestoreStats,
  setPopoverDismissed,
  showStarted,
} = slice.actions;

export default slice.reducer;

// ── Selectors ────────────────────────────────────────────────────────────────

type StateWithMischief = { idleMischief: IdleMischiefState };

export const selectMischiefStatus = (s: StateWithMischief) =>
  s.idleMischief.status;
export const selectMischiefCurrentAct = (s: StateWithMischief) =>
  s.idleMischief.currentAct;
export const selectMischiefManualTrigger = (s: StateWithMischief) =>
  s.idleMischief.manualTrigger;
export const selectMischiefSettings = (s: StateWithMischief) =>
  s.idleMischief.settings;
export const selectMischiefLog = (s: StateWithMischief) => s.idleMischief.log;
export const selectMischiefLastRestoreStats = (s: StateWithMischief) =>
  s.idleMischief.lastRestoreStats;
export const selectMischiefPopoverDismissed = (s: StateWithMischief) =>
  s.idleMischief.popoverDismissed;
