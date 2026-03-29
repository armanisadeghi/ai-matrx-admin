/**
 * Agent Settings Feature — Public API
 *
 * UI components for rendering agent/prompt settings panels.
 * All Redux logic lives in lib/redux/slices/agent-settings/.
 */

// Responsive entry points
export { AgentSettingsPanel } from "./components/AgentSettingsPanel";
export { AgentSettingsDrawer } from "./components/AgentSettingsDrawer";

// Shared content (compose your own wrapper)
export { AgentSettingsContent } from "./components/AgentSettingsContent";

// Individual sections (for custom layouts)
export { ModelSelectorRow } from "./components/ModelSelectorRow";
export { LLMParamsGrid } from "./components/LLMParamsGrid";
export { ToolSelectorPanel } from "./components/ToolSelectorPanel";
export { VariableDefaultsEditor } from "./components/VariableDefaultsEditor";

// Conflict dialog (self-manages visibility via Redux pendingSwitch)
export { ModelSwitchConflictDialog } from "./components/ModelSwitchConflictDialog";

// Full modal — controlled and self-contained button variants
export {
  AgentSettingsModal,
  AgentSettingsModalButton,
} from "./components/AgentSettingsModal";

// Re-export Redux API for convenience
export {
  // Slice actions
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
  // Thunks
  loadAgentSettings,
  loadAgentSettingsDirect,
  requestModelSwitch,
  saveAgentSettings,
  // Selectors
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
  selectAgentStatus,
  selectActiveAgentId,
  selectActiveEffectiveSettings,
  selectActiveModelId,
} from "@/lib/redux/slices/agent-settings";

// Types
export type {
  AgentSettings,
  AgentSettingsEntry,
  AgentSettingsState,
  AgentSource,
  AgentContext,
  AgentVariable,
  ControlDefinition,
  NormalizedControls,
  ConflictItem,
  ConflictReason,
  ResolutionMode,
  PendingModelSwitch,
} from "@/lib/redux/slices/agent-settings";
