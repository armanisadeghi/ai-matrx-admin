/**
 * Prompt Builtins Feature
 * 
 * This feature manages the prompt builtins system, including:
 * - Shortcut categories for organizing prompts
 * - Prompt builtins (reusable prompt templates)
 * - Prompt shortcuts (UI triggers for prompts)
 * - Scope mapping from application context to prompt variables
 */

// Export types
export type {
  ShortcutCategory,
  PromptBuiltin,
  PromptShortcut,
  ScopeMapping,
  ApplicationScope,
  CreateShortcutCategoryInput,
  UpdateShortcutCategoryInput,
  CreatePromptBuiltinInput,
  UpdatePromptBuiltinInput,
  CreatePromptShortcutInput,
  UpdatePromptShortcutInput,
  ContextMenuRow,
  PromptExecutionData,
} from './types';

// Export constants
export {
  PLACEMENT_TYPES,
  PLACEMENT_TYPE_META,
  SCOPE_LEVELS,
  SCOPE_UNAVAILABLE_VALUES,
  COMMON_SCOPE_CONFIGURATIONS,
  SCOPE_CONFIGURATION_DESCRIPTIONS,
} from './constants';

export type { PlacementType, ScopeLevel } from './constants';

// Export services
export {
  // Shortcut Categories
  fetchShortcutCategories,
  getShortcutCategoryById,
  createShortcutCategory,
  updateShortcutCategory,
  deleteShortcutCategory,
  deactivateShortcutCategory,
  activateShortcutCategory,
  
  // Prompt Builtins
  fetchPromptBuiltins,
  getPromptBuiltinById,
  createPromptBuiltin,
  updatePromptBuiltin,
  deletePromptBuiltin,
  deactivatePromptBuiltin,
  activatePromptBuiltin,
  
  // Prompt Shortcuts
  fetchPromptShortcuts,
  getPromptShortcutById,
  createPromptShortcut,
  updatePromptShortcut,
  deletePromptShortcut,
  deactivatePromptShortcut,
  activatePromptShortcut,
  
  // Context Menu
  fetchContextMenuView,
  getPromptExecutionData,
  
  // Batch Operations
  fetchShortcutsWithRelations,
  fetchCategoriesWithShortcutCounts,
} from './services/admin-service';

// Export utilities
export {
  // Execution utilities
  mapScopeToVariables,
  preparePromptExecution,
  prepareForUsePromptExecution,
  createEmptyScope,
  createUnavailableScope,
  isScopeValueEmpty,
  sanitizeScopeValue,
  substituteVariables,
  processMessagesWithVariables,
  getScopeMappingSummary,
} from './utils/execution';

export {
  // Validation utilities
  validateScopeMappings,
  analyzeScopeMappingIssues,
  validateScopeMappingKeys,
  validateMappedVariablesExist,
  validatePromptBuiltin,
  validateShortcutReferences,
  validateCategoryHierarchy,
} from './utils/validation';

