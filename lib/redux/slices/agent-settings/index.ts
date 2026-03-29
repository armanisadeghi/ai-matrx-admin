/**
 * Agent Settings — Barrel Export
 *
 * Public API for the agentSettings Redux system.
 * Import everything consumers need from here.
 */

// Reducer (default export for rootReducer)
export { default as agentSettingsReducer } from "./agentSettingsSlice";

// Actions & thunks
export {
  agentSettingsActions,
  initializeAgent,
  setActiveAgent,
  removeAgent,
  setOverride,
  applySettingsFromDialog,
  resetOverride,
  resetAllOverrides,
  updateDefaults,
  addVariable,
  updateVariable,
  removeVariable,
  setVariableOverride,
  resetVariableOverride,
  resetAllVariableOverrides,
  setResolutionMode,
  setCustomConflictAction,
  confirmModelSwitch,
  cancelModelSwitch,
  setLoading,
  setSaving,
  setError,
  clearError,
  // Thunks
  loadAgentSettings,
  loadAgentSettingsDirect,
  requestModelSwitch,
  saveAgentSettings,
  fetchAvailableTools,
} from "./agentSettingsSlice";

// Selectors
export {
  selectEntry,
  selectDefaults,
  selectOverrides,
  selectEffectiveSettings,
  selectEffectiveModelId,
  selectEffectiveModelName,
  selectNormalizedControls,
  selectPendingSwitch,
  selectHasPendingSwitch,
  selectPreviewedResolution,
  selectConflictActions,
  selectConflictSummary,
  selectApiPayload,
  selectHasOverrides,
  selectOverriddenFields,
  selectVariableDefaults,
  selectVariableOverrides,
  selectHasVariables,
  selectEffectiveVariableValues,
  selectIsDirty,
  selectIsLoading,
  selectIsSaving,
  selectError,
  selectContext,
  selectSource,
  selectLastFetchedAt,
  selectAgentStatus,
  selectActiveAgentId,
  selectActiveEffectiveSettings,
  selectActiveModelId,
  selectAllEntries,
  selectAllAgentIds,
  selectAvailableTools,
  selectIsLoadingTools,
} from "./selectors";

// Types
export type {
  AgentSettings,
  AgentSettingsEntry,
  AgentSettingsState,
  AgentSource,
  AgentContext,
  AgentVariable,
  AvailableTool,
  ControlDefinition,
  ControlType,
  NormalizedControls,
  ConflictItem,
  ConflictReason,
  ConflictAction,
  ResolutionMode,
  PendingModelSwitch,
  RawAgentDbRow,
  ResponseFormatValue,
} from "./types";

export { UI_ONLY_FIELDS } from "./types";

// Internal utilities (for advanced use — prefer selectors where possible)
export {
  PARAM_ALIASES,
  parseModelControls,
  extractModelDefaults,
  detectConflicts,
  resolveConflicts,
  getActionForMode,
  computeOverrideDiff,
  buildApiPayload,
  mergeEffectiveSettings,
  mergeVariableValues,
  sanitizeSettings,
} from "./internal-utils";
