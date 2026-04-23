"use client";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  AgentConnectionsSection,
  Scope,
} from "../../types";

/**
 * UI state for the Agent Customizations window. Kept separate from the `skl`
 * slice (which holds DB data) so this survives scope changes cleanly.
 *
 * `viewScope` is the user-selected filter on list views. The actual scope ID
 * (organization_id, project_id, task_id) comes from `appContext` — we do NOT
 * mirror those here to avoid drift.
 */
export interface AgentConnectionsUiState {
  viewScope: Scope;
  activeSection: AgentConnectionsSection;
  selectedItemId: string | null;
}

const initialState: AgentConnectionsUiState = {
  viewScope: "user",
  activeSection: "overview",
  selectedItemId: null,
};

const slice = createSlice({
  name: "agentConnectionsUi",
  initialState,
  reducers: {
    setViewScope(state, action: PayloadAction<Scope>) {
      state.viewScope = action.payload;
      // Changing scope invalidates the currently selected item — it might
      // not exist in the new scope.
      state.selectedItemId = null;
    },
    setActiveSection(state, action: PayloadAction<AgentConnectionsSection>) {
      state.activeSection = action.payload;
      state.selectedItemId = null;
    },
    setSelectedItemId(state, action: PayloadAction<string | null>) {
      state.selectedItemId = action.payload;
    },
    hydrateAgentConnectionsUi(
      state,
      action: PayloadAction<Partial<AgentConnectionsUiState>>,
    ) {
      if (action.payload.viewScope !== undefined)
        state.viewScope = action.payload.viewScope;
      if (action.payload.activeSection !== undefined)
        state.activeSection = action.payload.activeSection;
      if (action.payload.selectedItemId !== undefined)
        state.selectedItemId = action.payload.selectedItemId;
    },
    resetAgentConnectionsUi() {
      return initialState;
    },
  },
});

export const {
  setViewScope,
  setActiveSection,
  setSelectedItemId,
  hydrateAgentConnectionsUi,
  resetAgentConnectionsUi,
} = slice.actions;

export const agentConnectionsUiReducer = slice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────

type StateWithUi = { agentConnectionsUi: AgentConnectionsUiState };

export const selectViewScope = (state: StateWithUi): Scope =>
  state.agentConnectionsUi.viewScope;

export const selectActiveSection = (
  state: StateWithUi,
): AgentConnectionsSection => state.agentConnectionsUi.activeSection;

export const selectSelectedItemId = (state: StateWithUi): string | null =>
  state.agentConnectionsUi.selectedItemId;

export const selectAgentConnectionsUi = (
  state: StateWithUi,
): AgentConnectionsUiState => state.agentConnectionsUi;
