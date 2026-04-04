/**
 * Instance UI State Slice
 *
 * Manages per-instance UI configuration and display state.
 * Controls how the instance's results are rendered (modal, chat bubble,
 * inline, panel, toast) and tracks display-mode-specific state.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  BuilderAdvancedSettings,
  InstanceUIState,
  ResultDisplayMode,
} from "@/features/agents/types";
import { DEFAULT_BUILDER_ADVANCED_SETTINGS } from "@/features/agents/types/instance.types";
import { destroyInstance } from "../execution-instances/execution-instances.slice";

// =============================================================================
// State
// =============================================================================

export interface InstanceUIStateSlice {
  byInstanceId: Record<string, InstanceUIState>;

  /**
   * Admin/pilot feature — when true, chat renders in "block mode" where each
   * message is a distinct, collapsible block instead of a continuous thread.
   *
   * Lives here until promoted to a full user preference (userPreferencesSlice).
   * Read at execute time like apiBaseUrl — applied to the instance at creation.
   * Not tied to any specific instance — it is a global display preference.
   */
  useBlockMode: boolean;
}

const initialState: InstanceUIStateSlice = {
  byInstanceId: {},
  useBlockMode: false,
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
        reuseConversationId?: boolean;
        builderAdvancedSettings?: Partial<BuilderAdvancedSettings>;
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
        reuseConversationId = false,
        builderAdvancedSettings,
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
        reuseConversationId,
        builderAdvancedSettings: {
          ...DEFAULT_BUILDER_ADVANCED_SETTINGS,
          ...builderAdvancedSettings,
        },
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

    setReuseConversationId(
      state,
      action: PayloadAction<{ instanceId: string; value: boolean }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.reuseConversationId = action.payload.value;
      }
    },

    setBuilderAdvancedSettings(
      state,
      action: PayloadAction<{
        instanceId: string;
        changes: Partial<BuilderAdvancedSettings>;
      }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        Object.assign(entry.builderAdvancedSettings, action.payload.changes);
      }
    },

    resetBuilderAdvancedSettings(state, action: PayloadAction<string>) {
      const entry = state.byInstanceId[action.payload];
      if (entry) {
        entry.builderAdvancedSettings = {
          ...DEFAULT_BUILDER_ADVANCED_SETTINGS,
        };
      }
    },

    setStructuredInstruction(
      state,
      action: PayloadAction<{
        instanceId: string;
        changes: Record<string, unknown>;
      }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        Object.assign(
          entry.builderAdvancedSettings.structuredInstruction,
          action.payload.changes,
        );
      }
    },

    resetStructuredInstruction(state, action: PayloadAction<string>) {
      const entry = state.byInstanceId[action.payload];
      if (entry) {
        entry.builderAdvancedSettings.structuredInstruction = {};
      }
    },

    removeInstanceUIState(state, action: PayloadAction<string>) {
      delete state.byInstanceId[action.payload];
    },

    /**
     * Toggle block mode for the chat route.
     * Admin/pilot only — will move to userPreferencesSlice when promoted.
     * Global display preference — not tied to any specific instance.
     */
    setUseBlockMode(state, action: PayloadAction<boolean>) {
      state.useBlockMode = action.payload;
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
  setReuseConversationId,
  setBuilderAdvancedSettings,
  resetBuilderAdvancedSettings,
  setStructuredInstruction,
  resetStructuredInstruction,
  removeInstanceUIState,
  setUseBlockMode,
} = instanceUIStateSlice.actions;

export default instanceUIStateSlice.reducer;
