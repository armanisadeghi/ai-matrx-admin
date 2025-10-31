/**
 * Matrx Actions System - Type Definitions
 * 
 * This defines the core types for the Matrx Actions system.
 * These types mimic the database structure but work with hardcoded data for now.
 */

import { LucideIcon } from 'lucide-react';

// ============================================================================
// Context Types
// ============================================================================

/**
 * Where context data comes from
 */
export type ContextSource = 
  | 'selection'        // Highlighted text
  | 'editor_content'   // Full editor content
  | 'screenshot'       // Visual capture
  | 'page_html'        // DOM structure
  | 'manual_input'     // User input modal
  | 'clipboard'        // System clipboard
  | 'file_content'     // File(s)
  | 'custom';          // Custom provider

/**
 * Maps a prompt variable to a context source
 */
export interface VariableContextMapping {
  source: ContextSource;
  fallback?: ContextSource;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  prompt?: string; // For manual_input
  default?: string;
  label?: string; // Display label for the variable
}

/**
 * Requirements for when an action should be available
 */
export interface ContextRequirements {
  requiresSelection?: boolean;
  requiresEditor?: boolean;
  minSelectionLength?: number;
  maxSelectionLength?: number;
  fileTypes?: string[];
  editorTypes?: string[];
}

// ============================================================================
// Action Types
// ============================================================================

/**
 * Type of action
 */
export type ActionType = 'prompt' | 'function' | 'tool' | 'workflow' | 'api' | 'hybrid';

/**
 * How the result should be displayed
 */
export type ActionResultType = 'single-turn' | 'multi-turn';

/**
 * Core action definition - WHAT the action IS
 */
export interface MatrxAction {
  id: string;
  name: string;
  description?: string;
  icon?: string; // Lucide icon name
  
  // Action Type & Execution
  actionType: ActionType;
  promptId?: string;
  toolId?: string;
  workflowId?: string;
  functionName?: string;
  apiConfig?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
  };
  
  // Result Display Type
  resultType?: ActionResultType; // Defaults to 'single-turn' if not specified
  
  // Variable Mapping (for prompt-based actions)
  variableContextMap?: Record<string, VariableContextMapping>;
  
  // Execution Settings
  executionSettings?: {
    confirmBeforeExecute?: boolean;
    showLoadingModal?: boolean;
    timeoutMs?: number;
  };
  
  // Metadata
  scope: 'system' | 'user' | 'org' | 'workspace';
  isSystem: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

// ============================================================================
// Menu Item Types
// ============================================================================

/**
 * Category for organizing actions
 */
export type ActionCategory = 
  | 'standalone'      // Top-level items
  | 'matrx_create'    // Matrx Create submenu
  | 'translation'     // Translation submenu
  | 'personal'        // Personal Actions
  | 'org'             // Org Actions
  | 'workspace';      // Workspace Actions

/**
 * Where the menu appears
 */
export type MenuType = 'context_menu' | 'toolbar' | 'command_palette' | 'quick_actions';

/**
 * Menu item - WHERE/HOW the action appears
 */
export interface MatrxActionMenuItem {
  id: string;
  actionId: string; // References MatrxAction
  
  // Menu Structure
  menuType: MenuType;
  category: ActionCategory;
  subcategory?: string; // For nested items within a category
  displayOrder: number;
  
  // Display Settings (can override action defaults)
  displayLabel?: string;
  displayIcon?: string;
  displayDescription?: string;
  showInMenu: boolean;
  isFeatured?: boolean;
  
  // Context Requirements (for this specific placement)
  contextRequirements?: ContextRequirements;
  
  // Variable Overrides (for this specific placement)
  variableOverrides?: Record<string, Partial<VariableContextMapping>>;
  
  // UI Settings
  uiSettings?: {
    outputDestination?: 'canvas' | 'toast' | 'modal' | 'inline';
    successMessage?: string;
    showModal?: boolean;
    modalTitle?: string;
  };
  
  // Metadata
  scope: 'system' | 'user' | 'org' | 'workspace';
  isSystem: boolean;
}

// ============================================================================
// Composite Types (for rendering)
// ============================================================================

/**
 * Combined action + menu item data (for efficient rendering)
 */
export interface MatrxActionMenuItemWithAction extends MatrxActionMenuItem {
  action: MatrxAction;
  // Computed display values (respecting overrides)
  effectiveLabel: string;
  effectiveIcon?: string;
  effectiveDescription?: string;
}

/**
 * Hierarchical menu structure for rendering
 */
export interface MatrxMenuCategory {
  category: ActionCategory;
  label: string;
  icon?: LucideIcon;
  items: MatrxActionMenuItemWithAction[];
  subcategories?: MatrxMenuSubcategory[];
}

export interface MatrxMenuSubcategory {
  subcategory: string;
  label: string;
  items: MatrxActionMenuItemWithAction[];
}

// ============================================================================
// Context Resolution Types
// ============================================================================

/**
 * Resolved context data
 */
export interface ResolvedContext {
  [variableName: string]: string;
}

/**
 * Context that's available for resolution
 */
export interface AvailableContext {
  selectedText?: string;
  editorContent?: string;
  screenshot?: string;
  pageHtml?: string;
  clipboard?: string;
  fileContent?: string;
  [key: string]: any; // Allow custom context
}

