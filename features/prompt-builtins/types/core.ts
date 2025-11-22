import { PromptMessage, PromptSettings, PromptVariable } from "@/features/prompts/types/core"
import { PlacementType } from "../constants"
import type { ResultDisplay } from "./execution-modes"

// ============================================================================
// Scope Mapping Types
// ============================================================================

/**
 * Scope mapping structure
 * Maps component-specific available scopes to prompt variable names
 * 
 * CRITICAL: The keys represent scopes available from a specific component/context.
 * Common scope keys: 'selection', 'content', 'context'
 * But each component defines what scopes it provides.
 * 
 * Example for a card component:
 * - Card provides: selection (card title), content (card description), context (visible cards)
 * - Mapping: { selection: "card_title", content: "card_description", context: "all_cards" }
 * 
 * The UI should ONLY show scope keys that are available in the current context.
 */
export interface ScopeMapping {
  selection?: string;  // Variable name to receive 'selection' scope value
  content?: string;    // Variable name to receive 'content' scope value
  context?: string;    // Variable name to receive 'context' scope value
  [key: string]: string | undefined; // Allow other scope keys defined by components
}

/**
 * Runtime scope values provided by the application
 * 
 * DEFAULT SCOPES:
 * - selection: Currently highlighted/selected text
 * - content: Full content of current item (e.g., entire code file)
 * - context: Additional surrounding context (e.g., language, file path, other files)
 * 
 * CUSTOM SCOPES (dynamic):
 * Components can provide additional scopes beyond the defaults.
 * For example, Monaco editor might provide: errors, diagnostics, languageId, etc.
 * 
 * The [key: string] allows for any custom scope to be passed.
 */
export interface ApplicationScope {
  selection: string | null;  // Can be "", "NOT AVAILABLE", or actual content
  content: any;              // Can be "", "NOT AVAILABLE", or actual data
  context: any;              // Can be "", "NOT AVAILABLE", or actual data
  [key: string]: any;        // Allow custom scopes (errors, diagnostics, etc.)
}

// ============================================================================
// Database Table Types
// ============================================================================

// shortcut_categories
export interface ShortcutCategory {
  id: string
  placement_type: PlacementType
  parent_category_id: string | null
  label: string
  description: string | null
  icon_name: string // default 'SquareMenu'
  color: string // default 'zinc'
  sort_order: number // default 999
  is_active: boolean // default true
  metadata: Record<string, unknown> | null // Placeholder for future use - default {}
  enabled_contexts?: string[] | null // JSONB array of context names where this category appears
}

// prompt_builtins
export interface PromptBuiltin {
  id: string
  created_at: string // timestamptz
  updated_at: string // timestamptz
  name: string
  description: string | null
  messages: PromptMessage[]
  variableDefaults: PromptVariable[] | null // Matches actual prompt structure
  tools: Record<string, unknown> | null
  settings: PromptSettings
  created_by_user_id: string
  is_active: boolean // default true
  source_prompt_id: string | null // Track if this was converted from a user prompt
  source_prompt_snapshot_at: string | null // When the source prompt was snapshotted
}

// prompt_shortcuts
export interface PromptShortcut {
  id: string
  created_at: string // timestamptz
  updated_at: string // timestamptz
  prompt_builtin_id: string
  category_id: string
  label: string
  description: string | null
  icon_name: string | null
  keyboard_shortcut: string | null
  sort_order: number // default 0
  scope_mappings: ScopeMapping | null
  available_scopes: string[] | null // Defines which scope keys this shortcut can use
  // Execution Configuration (Boolean-based system)
  result_display: ResultDisplay // WHERE to display results - default 'modal'
  auto_run: boolean // Run immediately (true) or wait for user (false) - default true
  allow_chat: boolean // Allow conversation (true) or one-shot (false) - default true
  show_variables: boolean // Show variable form (true) or hide (false) - default false
  apply_variables: boolean // Apply variables (true) or ignore (false) - default true
  is_active: boolean // default true
  created_by_user_id: string | null
  enabled_contexts: string[] | null // JSONB array of context names where this shortcut appears
}

// ============================================================================
// Input Types for CRUD Operations
// ============================================================================

export interface CreateShortcutCategoryInput {
  id?: string; // Optional - will be generated if not provided
  placement_type: PlacementType;
  parent_category_id?: string | null;
  label: string;
  description?: string | null;
  icon_name?: string;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
  enabled_contexts?: string[] | null;
}

export interface UpdateShortcutCategoryInput {
  id: string;
  placement_type?: PlacementType;
  parent_category_id?: string | null;
  label?: string;
  description?: string | null;
  icon_name?: string;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
  enabled_contexts?: string[] | null;
}

export interface CreatePromptBuiltinInput {
  id?: string; // Optional - will be generated if not provided
  name: string;
  description?: string | null;
  messages: PromptMessage[];
  variableDefaults?: PromptVariable[] | null;
  tools?: Record<string, unknown> | null;
  settings?: PromptSettings;
  is_active?: boolean;
}

export interface UpdatePromptBuiltinInput {
  id: string;
  name?: string;
  description?: string | null;
  messages?: PromptMessage[];
  variableDefaults?: PromptVariable[] | null;
  tools?: Record<string, unknown> | null;
  settings?: PromptSettings;
  is_active?: boolean;
}

export interface CreatePromptShortcutInput {
  id?: string; // Optional - will be generated if not provided
  prompt_builtin_id?: string | null; // Optional - can be connected later
  category_id: string;
  label: string;
  description?: string | null;
  icon_name?: string | null;
  keyboard_shortcut?: string | null;
  sort_order?: number;
  scope_mappings?: ScopeMapping | null;
  available_scopes?: string[] | null; // Which scope keys can be used
  // Execution Configuration (Boolean-based)
  result_display?: ResultDisplay; // WHERE to display results - default 'modal'
  auto_run?: boolean; // Run immediately or wait - default true
  allow_chat?: boolean; // Allow conversation or one-shot - default true
  show_variables?: boolean; // Show variable form or hide - default false
  apply_variables?: boolean; // Apply variables or ignore - default true
  is_active?: boolean;
  enabled_contexts?: string[] | null;
}

export interface UpdatePromptShortcutInput {
  id: string;
  prompt_builtin_id?: string | null;
  category_id?: string;
  label?: string;
  description?: string | null;
  icon_name?: string | null;
  keyboard_shortcut?: string | null;
  sort_order?: number;
  scope_mappings?: ScopeMapping | null;
  available_scopes?: string[] | null; // Which scope keys can be used
  // Execution Configuration (Boolean-based)
  result_display?: ResultDisplay; // WHERE to display results
  auto_run?: boolean; // Run immediately or wait
  allow_chat?: boolean; // Allow conversation or one-shot
  show_variables?: boolean; // Show variable form or hide
  apply_variables?: boolean; // Apply variables or ignore
  is_active?: boolean;
  enabled_contexts?: string[] | null;
}

/**
 * Result from get_prompt_execution_data() function
 * Used when executing a prompt from a shortcut
 */
export interface PromptExecutionData {
  shortcut_id: string;
  shortcut_label: string;
  scope_mappings: ScopeMapping;
  available_scopes: string[] | null; // Which scope keys are valid for this shortcut
  prompt_builtin_id: string;
  prompt_name: string;
  messages: PromptMessage[];
  variableDefaults: PromptVariable[] | null; // Matches actual prompt structure (DB: variable_defaults)
  tools: any[] | null;
  settings: Record<string, any> | null;
}