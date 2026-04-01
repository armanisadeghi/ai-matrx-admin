/**
 * Instance UI State Slice
 *
 * Manages per-instance UI configuration and display state.
 * Controls how the instance's results are rendered (modal, chat bubble,
 * inline, panel, toast) and tracks display-mode-specific state.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  InstanceUIState,
  ResultDisplayMode,
} from "@/features/agents/types";
import { destroyInstance } from "../execution-instances/execution-instances.slice";

// =============================================================================
// State
// =============================================================================

export interface InstanceUIStateSlice {
  byInstanceId: Record<string, InstanceUIState>;
}

const initialState: InstanceUIStateSlice = {
  byInstanceId: {},
};

// =============================================================================
// Slice
// =============================================================================

const instanceUIStateSlice = createSlice({
  name: "instanceUIState",
  initialState,
  reducers: {
    initInstanceUIState(
      state,
      action: PayloadAction<{
        instanceId: string;
        displayMode?: ResultDisplayMode;
        allowChat?: boolean;
        showVariablePanel?: boolean;
        isCreator?: boolean;
        submitOnEnter?: boolean;
        autoClearConversation?: boolean;
      }>,
    ) {
      const {
        instanceId,
        displayMode = "modal-full",
        allowChat = true,
        showVariablePanel = false,
        isCreator = false,
        submitOnEnter = true,
        autoClearConversation = false,
      } = action.payload;

      state.byInstanceId[instanceId] = {
        instanceId,
        displayMode,
        allowChat,
        showVariablePanel,
        isExpanded: true,
        expandedVariableId: null,
        isCreator,
        showCreatorDebug: false,
        submitOnEnter,
        autoClearConversation,
        modeState: {},
      };
    },

    setDisplayMode(
      state,
      action: PayloadAction<{
        instanceId: string;
        mode: ResultDisplayMode;
      }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.displayMode = action.payload.mode;
        entry.modeState = {}; // Reset mode-specific state on mode change
      }
    },

    toggleExpanded(state, action: PayloadAction<string>) {
      const entry = state.byInstanceId[action.payload];
      if (entry) {
        entry.isExpanded = !entry.isExpanded;
      }
    },

    toggleVariablePanel(state, action: PayloadAction<string>) {
      const entry = state.byInstanceId[action.payload];
      if (entry) {
        entry.showVariablePanel = !entry.showVariablePanel;
      }
    },

    setAllowChat(
      state,
      action: PayloadAction<{ instanceId: string; allow: boolean }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.allowChat = action.payload.allow;
      }
    },

    /**
     * Update arbitrary mode-specific state.
     * E.g., scroll position, active tab, selected card.
     */
    updateModeState(
      state,
      action: PayloadAction<{
        instanceId: string;
        changes: Record<string, unknown>;
      }>,
    ) {
      const { instanceId, changes } = action.payload;
      const entry = state.byInstanceId[instanceId];
      if (entry) {
        Object.assign(entry.modeState, changes);
      }
    },

    /** Open a variable's edit popover. Pass null to close all. */
    setExpandedVariableId(
      state,
      action: PayloadAction<{ instanceId: string; variableId: string | null }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.expandedVariableId = action.payload.variableId;
      }
    },

    toggleCreatorDebug(state, action: PayloadAction<string>) {
      const entry = state.byInstanceId[action.payload];
      if (entry) {
        entry.showCreatorDebug = !entry.showCreatorDebug;
      }
    },

    setSubmitOnEnter(
      state,
      action: PayloadAction<{ instanceId: string; value: boolean }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.submitOnEnter = action.payload.value;
      }
    },

    setAutoClearConversation(
      state,
      action: PayloadAction<{ instanceId: string; value: boolean }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.autoClearConversation = action.payload.value;
      }
    },

    removeInstanceUIState(state, action: PayloadAction<string>) {
      delete state.byInstanceId[action.payload];
    },
  },

  extraReducers: (builder) => {
    builder.addCase(destroyInstance, (state, action) => {
      delete state.byInstanceId[action.payload];
    });
  },
});

export const {
  initInstanceUIState,
  setDisplayMode,
  toggleExpanded,
  toggleVariablePanel,
  setAllowChat,
  updateModeState,
  setExpandedVariableId,
  toggleCreatorDebug,
  setSubmitOnEnter,
  setAutoClearConversation,
  removeInstanceUIState,
} = instanceUIStateSlice.actions;

export default instanceUIStateSlice.reducer;
