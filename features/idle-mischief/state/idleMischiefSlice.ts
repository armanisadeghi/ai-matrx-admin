// features/idle-mischief/state/idleMischiefSlice.ts
//
// RTK slice — minimal state for the orchestrator.
//   currentAct  : which act is playing (null = nothing)
//   status      : "idle" | "playing" | "snapping-back"
//   manualTrigger : monotonically increasing nonce; bumped to force a re-fire
//   settings    : speed / loop / enabled (dev panel writes these)

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MischiefActId, MischiefStatus, MischiefSettings } from "../types";

export interface IdleMischiefState {
  status: MischiefStatus;
  currentAct: MischiefActId | null;
  /** Bumped by the dev panel to ask the orchestrator to start a specific act. */
  manualTrigger: { actId: MischiefActId | null; nonce: number };
  settings: MischiefSettings;
}

const initialState: IdleMischiefState = {
  status: "idle",
  currentAct: null,
  manualTrigger: { actId: null, nonce: 0 },
  settings: {
    enabled: true,
    speed: 1,
    loop: false,
  },
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
    },
    requestSnapBack(state) {
      // The orchestrator watches `status` — flipping to snapping-back is
      // enough; current act effects observe via subscription.
      state.status = "snapping-back";
    },
    setSettings(
      state,
      action: PayloadAction<Partial<MischiefSettings>>,
    ) {
      state.settings = { ...state.settings, ...action.payload };
    },
  },
});

export const {
  setStatus,
  setCurrentAct,
  triggerAct,
  requestSnapBack,
  setSettings,
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
