/**
 * Prompt Builtins Types - Barrel Export
 * Central source of truth for all prompt builtin types
 */

// Core database types and CRUD inputs
export type {
  // Scope types
  ScopeMapping,
  ApplicationScope,
  
  // Database table types
  ShortcutCategory,
  PromptBuiltin,
  PromptShortcut,
  
  // CRUD input types
  CreateShortcutCategoryInput,
  UpdateShortcutCategoryInput,
  CreatePromptBuiltinInput,
  UpdatePromptBuiltinInput,
  CreatePromptShortcutInput,
  UpdatePromptShortcutInput,
  
  // View types
  PromptExecutionData,
} from './core';

// Execution configuration types
export type {
  ResultDisplay,
  PromptExecutionConfig,
} from './execution-modes';

export {
  RESULT_DISPLAY_META,
  DEFAULT_EXECUTION_CONFIG,
  parseExecutionConfig,
  requiresModalUI,
  requiresInlineUI,
  showsResults,
} from './execution-modes';

// Menu/UI types
export type {
  ShortcutItem,
  ContentBlockItem,
  MenuItem,
  CategoryGroup,
} from './menu';

