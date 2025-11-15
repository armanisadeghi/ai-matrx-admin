/**
 * Prompt Builtins Feature - Main Export
 * 
 * Provides prompt builtin management and execution capabilities
 */

// Types - all exported from types barrel
export type {
  // Core types
  ScopeMapping,
  ApplicationScope,
  ShortcutCategory,
  PromptBuiltin,
  PromptShortcut,
  CreateShortcutCategoryInput,
  UpdateShortcutCategoryInput,
  CreatePromptBuiltinInput,
  UpdatePromptBuiltinInput,
  CreatePromptShortcutInput,
  UpdatePromptShortcutInput,
  PromptExecutionData,
  
  // Execution types
  ResultDisplay,
  PromptExecutionConfig,
  LegacyPromptExecutionMode,
  
  // Menu types
  ShortcutItem,
  ContentBlockItem,
  MenuItem,
  CategoryGroup,
} from './types';

export {
  RESULT_DISPLAY_META,
  DEFAULT_EXECUTION_CONFIG,
  parseExecutionConfig,
  requiresModalUI,
  requiresInlineUI,
  showsResults,
  convertLegacyMode,
} from './types';

// Constants
export {
  PLACEMENT_TYPES,
  PLACEMENT_TYPE_META,
  SCOPE_LEVELS,
  SCOPE_UNAVAILABLE_VALUES,
  COMMON_SCOPE_CONFIGURATIONS,
  SCOPE_CONFIGURATION_DESCRIPTIONS,
  getPlacementTypeMeta,
} from './constants';

export type { PlacementType, ScopeLevel } from './constants';

// Hooks
export {
  useContextMenuShortcuts,
  useShortcutsByPlacement,
  useShortcutExecution,
} from './hooks';

// Utils
export {
  mapScopeToVariables,
  preparePromptExecution,
  prepareForUsePromptExecution,
} from './utils/execution';

export {
  validateScopeMappingKeys,
  validateMappedVariablesExist,
  analyzeScopeMappingIssues,
} from './utils/validation';

// Admin Components
export {
  PromptBuiltinsManager,
  ShortcutsTableManager,
  PromptBuiltinsTableManager,
  PromptBuiltinEditPanel,
  PromptBuiltinEditDialog,
  SelectPromptForBuiltinModal,
} from './admin';
