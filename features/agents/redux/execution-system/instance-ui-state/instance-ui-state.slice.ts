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
  JsonExtractionConfig,
  ResultDisplayMode,
  VariableInputStyle,
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
  byConversationId: Record<string, InstanceUIState>;

  /**
   * Admin/pilot feature — when true, chat renders in "block mode" where each
   * message is a distinct, collapsible block instead of a continuous thread.
   *
   * Lives here until promoted to a full user preference (userPreferencesSlice).
   * Read at execute time like apiBaseUrl — applied to the instance at creation.
   * Not tied to any specific instance — it is a global display preference.
   */
  isBlockMode: boolean;
}

const initialState: InstanceUIStateSlice = {
  byConversationId: {},
  isBlockMode: false,
};

// =============================================================================
// Init payload type
// =============================================================================

export interface InitInstanceUIStatePayload {
  conversationId: string;
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
  showAutoClearToggle?: boolean;
  autoClearConversation?: boolean;
  reuseConversationId?: boolean;
  builderAdvancedSettings?: Partial<BuilderAdvancedSettings>;
  hideReasoning?: boolean;
  hideToolResults?: boolean;
  preExecutionMessage?: string | null;
  variableInputStyle?: VariableInputStyle;
  jsonExtraction?: JsonExtractionConfig | null;
  /** Original text selected in an editor/notes surface before launch. Used by text-manipulation callbacks. */
  originalText?: string | null;
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
        conversationId,
        displayMode = "direct",
        autoRun = false,
        allowChat = true,
        usePreExecutionInput = false,
        showVariablePanel = false,
        showDefinitionMessages = true,
        showDefinitionMessageContent = false,
        hiddenMessageCount = 0,
        callbackGroupId = null,
        isCreator = false,
        submitOnEnter = true,
        showAutoClearToggle = false,
        autoClearConversation = false,
        reuseConversationId = false,
        builderAdvancedSettings,
        hideReasoning = false,
        hideToolResults = false,
        preExecutionMessage = null,
        variableInputStyle = "inline",
        jsonExtraction = null,
        originalText = null,
      } = action.payload;

      state.byConversationId[conversationId] = {
        conversationId,
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
        showAutoClearToggle,
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
        jsonExtraction,
        originalText,
      };
    },

    setDisplayMode(
      state,
      action: PayloadAction<{
        conversationId: string;
        mode: ResultDisplayMode;
      }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.displayMode = action.payload.mode;
        entry.modeState = {};
      }
    },

    setAutoRun(
      state,
      action: PayloadAction<{ conversationId: string; value: boolean }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.autoRun = action.payload.value;
      }
    },

    setAllowChat(
      state,
      action: PayloadAction<{ conversationId: string; allow: boolean }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.allowChat = action.payload.allow;
      }
    },

    setUsePreExecutionInput(
      state,
      action: PayloadAction<{ conversationId: string; value: boolean }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.usePreExecutionInput = action.payload.value;
      }
    },

    setPreExecutionSatisfied(
      state,
      action: PayloadAction<{ conversationId: string; value: boolean }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.preExecutionSatisfied = action.payload.value;
      }
    },

    // ── Visibility controls ──────────────────────────────────────────────────

    toggleVariablePanel(state, action: PayloadAction<string>) {
      const entry = state.byConversationId[action.payload];
      if (entry) {
        entry.showVariablePanel = !entry.showVariablePanel;
      }
    },

    setShowVariablePanel(
      state,
      action: PayloadAction<{ conversationId: string; value: boolean }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.showVariablePanel = action.payload.value;
      }
    },

    setShowDefinitionMessages(
      state,
      action: PayloadAction<{ conversationId: string; value: boolean }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.showDefinitionMessages = action.payload.value;
      }
    },

    setShowDefinitionMessageContent(
      state,
      action: PayloadAction<{ conversationId: string; value: boolean }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.showDefinitionMessageContent = action.payload.value;
      }
    },

    setHiddenMessageCount(
      state,
      action: PayloadAction<{ conversationId: string; count: number }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
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
      action: PayloadAction<{ conversationId: string; showVariables: boolean }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
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
      action: PayloadAction<{ conversationId: string; groupId: string | null }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.callbackGroupId = action.payload.groupId;
      }
    },

    // ── Layout & interaction ─────────────────────────────────────────────────

    toggleExpanded(state, action: PayloadAction<string>) {
      const entry = state.byConversationId[action.payload];
      if (entry) {
        entry.isExpanded = !entry.isExpanded;
      }
    },

    updateModeState(
      state,
      action: PayloadAction<{
        conversationId: string;
        changes: Record<string, unknown>;
      }>,
    ) {
      const { conversationId, changes } = action.payload;
      const entry = state.byConversationId[conversationId];
      if (entry) {
        Object.assign(entry.modeState, changes);
      }
    },

    setExpandedVariableId(
      state,
      action: PayloadAction<{
        conversationId: string;
        variableId: string | null;
      }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.expandedVariableId = action.payload.variableId;
      }
    },

    toggleCreatorDebug(state, action: PayloadAction<string>) {
      const entry = state.byConversationId[action.payload];
      if (entry) {
        entry.showCreatorDebug = !entry.showCreatorDebug;
      }
    },

    setSubmitOnEnter(
      state,
      action: PayloadAction<{ conversationId: string; value: boolean }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.submitOnEnter = action.payload.value;
      }
    },

    setShowAutoClearToggle(
      state,
      action: PayloadAction<{ conversationId: string; value: boolean }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.showAutoClearToggle = action.payload.value;
      }
    },
    setAutoClearConversation(
      state,
      action: PayloadAction<{ conversationId: string; value: boolean }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.autoClearConversation = action.payload.value;
      }
    },

    setReuseConversationId(
      state,
      action: PayloadAction<{ conversationId: string; value: boolean }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.reuseConversationId = action.payload.value;
      }
    },

    setBuilderAdvancedSettings(
      state,
      action: PayloadAction<{
        conversationId: string;
        changes: Partial<BuilderAdvancedSettings>;
      }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        Object.assign(entry.builderAdvancedSettings, action.payload.changes);
      }
    },

    resetBuilderAdvancedSettings(state, action: PayloadAction<string>) {
      const entry = state.byConversationId[action.payload];
      if (entry) {
        entry.builderAdvancedSettings = {
          ...DEFAULT_BUILDER_ADVANCED_SETTINGS,
        };
      }
    },

    setStructuredInstruction(
      state,
      action: PayloadAction<{
        conversationId: string;
        changes: Record<string, unknown>;
      }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        Object.assign(
          entry.builderAdvancedSettings.structuredInstruction,
          action.payload.changes,
        );
      }
    },

    resetStructuredInstruction(state, action: PayloadAction<string>) {
      const entry = state.byConversationId[action.payload];
      if (entry) {
        entry.builderAdvancedSettings.structuredInstruction = {};
      }
    },

    setHideReasoning(
      state,
      action: PayloadAction<{ conversationId: string; value: boolean }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.hideReasoning = action.payload.value;
      }
    },

    setHideToolResults(
      state,
      action: PayloadAction<{ conversationId: string; value: boolean }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.hideToolResults = action.payload.value;
      }
    },

    setPreExecutionMessage(
      state,
      action: PayloadAction<{ conversationId: string; message: string | null }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.preExecutionMessage = action.payload.message;
      }
    },

    setVariableInputStyle(
      state,
      action: PayloadAction<{
        conversationId: string;
        style: VariableInputStyle;
      }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.variableInputStyle = action.payload.style;
      }
    },

    setOriginalText(
      state,
      action: PayloadAction<{ conversationId: string; text: string | null }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (entry) {
        entry.originalText = action.payload.text;
      }
    },

    removeInstanceUIState(state, action: PayloadAction<string>) {
      delete state.byConversationId[action.payload];
    },

    setUseBlockMode(state, action: PayloadAction<boolean>) {
      state.isBlockMode = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder.addCase(destroyInstance, (state, action) => {
      const conversationId = action.payload;
      const entry = state.byConversationId[conversationId];
      if (entry?.callbackGroupId) {
        callbackManager.removeGroup(entry.callbackGroupId);
      }
      delete state.byConversationId[conversationId];
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
  setShowAutoClearToggle,
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
  setOriginalText,
  removeInstanceUIState,
  setUseBlockMode,
} = instanceUIStateSlice.actions;

export default instanceUIStateSlice.reducer;
