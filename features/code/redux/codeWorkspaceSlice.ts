import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ActivityViewId } from "../types";
import type { RootState } from "@/lib/redux/store";

export interface CodeWorkspaceState {
  /** Which activity-bar view is currently selected. */
  activeView: ActivityViewId;
  /** Whether the side panel (file tree / search / etc.) is visible. */
  sideOpen: boolean;
  /** Whether the optional right slot (chat) is visible. */
  rightOpen: boolean;
  /** Whether the optional far-right slot (chat history) is visible. */
  farRightOpen: boolean;
  /** The last instanceId the user selected from the Sandboxes view. */
  activeSandboxId: string | null;
}

const initialState: CodeWorkspaceState = {
  activeView: "explorer",
  sideOpen: true,
  rightOpen: true,
  farRightOpen: false,
  activeSandboxId: null,
};

const slice = createSlice({
  name: "codeWorkspace",
  initialState,
  reducers: {
    setActiveView(state, action: PayloadAction<ActivityViewId>) {
      // Toggle behavior: clicking the active icon collapses the side panel.
      if (state.activeView === action.payload && state.sideOpen) {
        state.sideOpen = false;
      } else {
        state.activeView = action.payload;
        state.sideOpen = true;
      }
    },
    setSideOpen(state, action: PayloadAction<boolean>) {
      state.sideOpen = action.payload;
    },
    setRightOpen(state, action: PayloadAction<boolean>) {
      state.rightOpen = action.payload;
    },
    setFarRightOpen(state, action: PayloadAction<boolean>) {
      state.farRightOpen = action.payload;
    },
    setActiveSandboxId(state, action: PayloadAction<string | null>) {
      state.activeSandboxId = action.payload;
    },
  },
});

export const {
  setActiveView,
  setSideOpen,
  setRightOpen,
  setFarRightOpen,
  setActiveSandboxId,
} = slice.actions;

export default slice.reducer;

// ─── Selectors ──────────────────────────────────────────────────────────────

export const selectCodeWorkspace = (state: RootState) =>
  state.codeWorkspace ?? initialState;

export const selectActiveView = (state: RootState) =>
  selectCodeWorkspace(state).activeView;
export const selectSideOpen = (state: RootState) =>
  selectCodeWorkspace(state).sideOpen;
export const selectRightOpen = (state: RootState) =>
  selectCodeWorkspace(state).rightOpen;
export const selectFarRightOpen = (state: RootState) =>
  selectCodeWorkspace(state).farRightOpen;
export const selectActiveSandboxId = (state: RootState) =>
  selectCodeWorkspace(state).activeSandboxId;
