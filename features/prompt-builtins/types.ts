import { PromptMessage, PromptSettings, PromptVariable } from "@/features/prompts/types/core"
import { PlacementType } from "./constants"

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
 */
export interface ApplicationScope {
  selection: string | null;  // Can be "", "NOT AVAILABLE", or actual content
  content: any;              // Can be "", "NOT AVAILABLE", or actual data
  context: any;              // Can be "", "NOT AVAILABLE", or actual data
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
  available_scopes: string[] | null // NEW: Defines which scope keys this shortcut can use
  is_active: boolean // default true
  created_by_user_id: string | null
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
  available_scopes?: string[] | null; // NEW: Which scope keys can be used
  is_active?: boolean;
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
  available_scopes?: string[] | null; // NEW: Which scope keys can be used
  is_active?: boolean;
}

// ============================================================================
// View Types (from database views)
// ============================================================================

/**
 * Row from context_menu_view
 * Used for rendering the context menu
 */
export interface ContextMenuRow {
  // Category info
  category_id: string;
  parent_category_id: string | null;
  category_label: string;
  category_description: string | null;
  category_icon: string;
  category_color: string;
  category_sort_order: number;
  category_depth: number;
  category_sort_path: number[];
  category_path: string;
  category_metadata: Record<string, any>;
  
  // Shortcut info (null if this is just a category header)
  shortcut_id: string | null;
  prompt_builtin_id: string | null;
  shortcut_label: string | null;
  shortcut_description: string | null;
  shortcut_icon: string | null;
  keyboard_shortcut: string | null;
  shortcut_sort_order: number | null;
  scope_mappings: ScopeMapping | null;
  available_scopes: string[] | null;
  
  // Flags
  is_standalone: boolean;
  
  // Preview
  prompt_name: string | null;
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