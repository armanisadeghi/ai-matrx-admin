/**
 * Instance UI State Slice
 *
 * Manages per-instance UI configuration and display state.
 * Controls how the instance's results are rendered (modal, chat bubble,
 * inline, panel, toast) and tracks display-mode-specific state.
 *
 * Philosophy: Fine-grained state, coarse-grained config.
 * Each field controls exactly one behavior. Launch options / shortcut configs
 * flip multiple fields at once via helpers (e.g. resolveVisibilitySettings).
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  BuilderAdvancedSettings,
  InstanceUIState,
  ResultDisplayMode,
} from "@/features/agents/types";
import { DEFAULT_BUILDER_ADVANCED_SETTINGS } from "@/features/agents/types/instance.types";
import { destroyInstance } from "../execution-instances/execution-instances.slice";
import { callbackManager } from "@/utils/callbackManager";

// =============================================================================
// Visibility helper — maps coarse showVariables config to fine-grained state
// =============================================================================

export function resolveVisibilitySettings(showVariables?: boolean): {
  showVariablePanel?: boolean;
  showDefinitionMessages?: boolean;
  showDefinitionMessageContent?: boolean;
} {
  if (showVariables === false) {
    return {
      showVariablePanel: false,
      showDefinitionMessages: false,
      showDefinitionMessageContent: false,
    };
  }
  if (showVariables === true) {
    return {
      showVariablePanel: true,
      showDefinitionMessages: true,
      showDefinitionMessageContent: false,
    };
  }
  return {};
}

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
// Init payload type
// =============================================================================

export interface InitInstanceUIStatePayload {
  instanceId: string;
  displayMode?: ResultDisplayMode;
  autoRun?: boolean;
  allowChat?: boolean;
  usePreExecutionInput?: boolean;
  showVariablePanel?: boolean;
  showDefinitionMessages?: boolean;
  showDefinitionMessageContent?: boolean;
  hiddenMessageCount?: number;
  callbackGroupId?: string | null;
  isCreator?: boolean;
  submitOnEnter?: boolean;
  autoClearConversation?: boolean;
  reuseConversationId?: boolean;
  builderAdvancedSettings?: Partial<BuilderAdvancedSettings>;
  hideReasoning?: boolean;
  hideToolResults?: boolean;
  preExecutionMessage?: string | null;
  variableInputStyle?: "inline" | "wizard";
}

// =============================================================================
// Slice
// =============================================================================

const instanceUIStateSlice = createSlice({
  name: "instanceUIState",
  initialState,
  reducers: {
    initInstanceUIState(
      state,
      action: PayloadAction<InitInstanceUIStatePayload>,
    ) {
      const {
        instanceId,
        displayMode = "modal-full",
        autoRun = true,
        allowChat = true,
        usePreExecutionInput = false,
        showVariablePanel = false,
        showDefinitionMessages = true,
        showDefinitionMessageContent = false,
        hiddenMessageCount = 0,
        callbackGroupId = null,
        isCreator = false,
        submitOnEnter = true,
        autoClearConversation = false,
        reuseConversationId = false,
        builderAdvancedSettings,
        hideReasoning = false,
        hideToolResults = false,
        preExecutionMessage = null,
        variableInputStyle = "inline",
      } = action.payload;

      state.byInstanceId[instanceId] = {
        instanceId,
        displayMode,
        autoRun,
        allowChat,
        usePreExecutionInput,
        preExecutionSatisfied: false,
        showVariablePanel,
        showDefinitionMessages,
        showDefinitionMessageContent,
        hiddenMessageCount,
        callbackGroupId,
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
        hideReasoning,
        hideToolResults,
        preExecutionMessage,
        variableInputStyle,
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
        entry.modeState = {};
      }
    },

    setAutoRun(
      state,
      action: PayloadAction<{ instanceId: string; value: boolean }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.autoRun = action.payload.value;
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

    setUsePreExecutionInput(
      state,
      action: PayloadAction<{ instanceId: string; value: boolean }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.usePreExecutionInput = action.payload.value;
      }
    },

    setPreExecutionSatisfied(
      state,
      action: PayloadAction<{ instanceId: string; value: boolean }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.preExecutionSatisfied = action.payload.value;
      }
    },

    // ── Visibility controls ──────────────────────────────────────────────────

    toggleVariablePanel(state, action: PayloadAction<string>) {
      const entry = state.byInstanceId[action.payload];
      if (entry) {
        entry.showVariablePanel = !entry.showVariablePanel;
      }
    },

    setShowVariablePanel(
      state,
      action: PayloadAction<{ instanceId: string; value: boolean }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.showVariablePanel = action.payload.value;
      }
    },

    setShowDefinitionMessages(
      state,
      action: PayloadAction<{ instanceId: string; value: boolean }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.showDefinitionMessages = action.payload.value;
      }
    },

    setShowDefinitionMessageContent(
      state,
      action: PayloadAction<{ instanceId: string; value: boolean }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.showDefinitionMessageContent = action.payload.value;
      }
    },

    setHiddenMessageCount(
      state,
      action: PayloadAction<{ instanceId: string; count: number }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.hiddenMessageCount = action.payload.count;
      }
    },

    /**
     * Coarse-grained action: apply a single showVariables boolean to flip
     * all three fine-grained visibility fields at once.
     * Used by shortcuts and launch options for convenience.
     */
    applyShowVariablesConfig(
      state,
      action: PayloadAction<{ instanceId: string; showVariables: boolean }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        const resolved = resolveVisibilitySettings(
          action.payload.showVariables,
        );
        if (resolved.showVariablePanel !== undefined)
          entry.showVariablePanel = resolved.showVariablePanel;
        if (resolved.showDefinitionMessages !== undefined)
          entry.showDefinitionMessages = resolved.showDefinitionMessages;
        if (resolved.showDefinitionMessageContent !== undefined)
          entry.showDefinitionMessageContent =
            resolved.showDefinitionMessageContent;
      }
    },

    // ── Callback management ──────────────────────────────────────────────────

    setCallbackGroupId(
      state,
      action: PayloadAction<{ instanceId: string; groupId: string | null }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.callbackGroupId = action.payload.groupId;
      }
    },

    // ── Layout & interaction ─────────────────────────────────────────────────

    toggleExpanded(state, action: PayloadAction<string>) {
      const entry = state.byInstanceId[action.payload];
      if (entry) {
        entry.isExpanded = !entry.isExpanded;
      }
    },

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

    setHideReasoning(
      state,
      action: PayloadAction<{ instanceId: string; value: boolean }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.hideReasoning = action.payload.value;
      }
    },

    setHideToolResults(
      state,
      action: PayloadAction<{ instanceId: string; value: boolean }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.hideToolResults = action.payload.value;
      }
    },

    setPreExecutionMessage(
      state,
      action: PayloadAction<{ instanceId: string; message: string | null }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.preExecutionMessage = action.payload.message;
      }
    },

    setVariableInputStyle(
      state,
      action: PayloadAction<{
        instanceId: string;
        style: "inline" | "wizard";
      }>,
    ) {
      const entry = state.byInstanceId[action.payload.instanceId];
      if (entry) {
        entry.variableInputStyle = action.payload.style;
      }
    },

    removeInstanceUIState(state, action: PayloadAction<string>) {
      delete state.byInstanceId[action.payload];
    },

    setUseBlockMode(state, action: PayloadAction<boolean>) {
      state.useBlockMode = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder.addCase(destroyInstance, (state, action) => {
      const instanceId = action.payload;
      const entry = state.byInstanceId[instanceId];
      if (entry?.callbackGroupId) {
        callbackManager.removeGroup(entry.callbackGroupId);
      }
      delete state.byInstanceId[instanceId];
    });
  },
});

export const {
  initInstanceUIState,
  setDisplayMode,
  setAutoRun,
  setAllowChat,
  setUsePreExecutionInput,
  setPreExecutionSatisfied,
  toggleVariablePanel,
  setShowVariablePanel,
  setShowDefinitionMessages,
  setShowDefinitionMessageContent,
  setHiddenMessageCount,
  applyShowVariablesConfig,
  setCallbackGroupId,
  toggleExpanded,
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
  setHideReasoning,
  setHideToolResults,
  setPreExecutionMessage,
  setVariableInputStyle,
  removeInstanceUIState,
  setUseBlockMode,
} = instanceUIStateSlice.actions;

export default instanceUIStateSlice.reducer;
