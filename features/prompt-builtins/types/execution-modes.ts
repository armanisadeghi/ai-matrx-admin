/**
 * Execution Configuration Types
 * 
 * Boolean-based execution configuration for prompt shortcuts.
 * Much clearer than string-based modes!
 */

// ============================================================================
// Result Display Types
// ============================================================================

/**
 * Result display determines WHERE/HOW the prompt results are shown
 */
export type ResultDisplay = 
  | 'modal'      // Opens in PromptRunnerModal (default)
  | 'inline'     // Executes inline, shows result modal with replace/insert options
  | 'background' // Executes silently, no UI (for automation)
  | 'sidebar'    // Opens in sidebar panel
  | 'toast';     // Shows result in a toast notification

/**
 * Metadata for result display types
 */
export const RESULT_DISPLAY_META = {
  modal: {
    label: 'Modal',
    description: 'Opens in a full modal dialog with chat interface',
    icon: 'Square',
  },
  inline: {
    label: 'Inline',
    description: 'Executes and shows result with text manipulation options',
    icon: 'FileEdit',
  },
  background: {
    label: 'Background',
    description: 'Executes silently without showing UI',
    icon: 'Loader',
  },
  sidebar: {
    label: 'Sidebar',
    description: 'Opens in a sidebar panel',
    icon: 'PanelRight',
  },
  toast: {
    label: 'Toast',
    description: 'Shows result in a toast notification',
    icon: 'MessageSquare',
  },
} as const;

// ============================================================================
// Execution Configuration
// ============================================================================

/**
 * Complete execution configuration for a shortcut
 * 
 * This replaces the confusing string-based modes with clear boolean flags:
 * - result_display: WHERE to show results
 * - auto_run: Whether to run immediately or wait for user
 * - allow_chat: Whether to allow conversation or one-shot
 * - show_variables: Whether to show variable form or hide it
 * - apply_variables: Whether to apply variables or ignore them
 */
export interface PromptExecutionConfig {
  /**
   * WHERE/HOW to display results
   * Default: 'modal'
   */
  result_display: ResultDisplay;
  
  /**
   * Whether to run immediately on open (true) or wait for user to click run (false)
   * Default: true
   */
  auto_run: boolean;
  
  /**
   * Whether to allow conversational mode (true) or one-shot execution (false)
   * Default: true
   */
  allow_chat: boolean;
  
  /**
   * Whether to show variable form (true) or hide it (false)
   * Variables are still applied if available even when hidden
   * Default: false
   */
  show_variables: boolean;
  
  /**
   * Whether to apply variables (true) or ignore them entirely (false)
   * Default: true
   */
  apply_variables: boolean;
}

/**
 * Default execution configuration
 */
export const DEFAULT_EXECUTION_CONFIG: PromptExecutionConfig = {
  result_display: 'modal',
  auto_run: true,
  allow_chat: true,
  show_variables: false,
  apply_variables: true,
};

/**
 * Parse execution config from database values
 */
export function parseExecutionConfig(
  result_display?: string | null,
  auto_run?: boolean | null,
  allow_chat?: boolean | null,
  show_variables?: boolean | null,
  apply_variables?: boolean | null
): PromptExecutionConfig {
  return {
    result_display: (result_display as ResultDisplay) || DEFAULT_EXECUTION_CONFIG.result_display,
    auto_run: auto_run ?? DEFAULT_EXECUTION_CONFIG.auto_run,
    allow_chat: allow_chat ?? DEFAULT_EXECUTION_CONFIG.allow_chat,
    show_variables: show_variables ?? DEFAULT_EXECUTION_CONFIG.show_variables,
    apply_variables: apply_variables ?? DEFAULT_EXECUTION_CONFIG.apply_variables,
  };
}

/**
 * Helper to determine if a display type requires modal UI
 */
export function requiresModalUI(display: ResultDisplay): boolean {
  return display === 'modal' || display === 'sidebar';
}

/**
 * Helper to determine if a display type requires inline text manipulation UI
 */
export function requiresInlineUI(display: ResultDisplay): boolean {
  return display === 'inline';
}

/**
 * Helper to determine if a display type shows results
 */
export function showsResults(display: ResultDisplay): boolean {
  return display !== 'background';
}

// ============================================================================
// Legacy Mode Conversion (for migration)
// ============================================================================

/**
 * Legacy modal execution modes (deprecated, use boolean flags instead)
 * Kept for backward compatibility during migration
 */
export type LegacyPromptExecutionMode = 
  | 'auto-run'
  | 'auto-run-one-shot'
  | 'manual-with-hidden-variables'
  | 'manual-with-visible-variables'
  | 'manual';

/**
 * Convert legacy mode string to new boolean config
 * Useful for migration from old system
 */
export function convertLegacyMode(mode: LegacyPromptExecutionMode): Omit<PromptExecutionConfig, 'result_display'> {
  switch (mode) {
    case 'auto-run':
      return {
        auto_run: true,
        allow_chat: true,
        show_variables: false,
        apply_variables: true,
      };
    
    case 'auto-run-one-shot':
      return {
        auto_run: true,
        allow_chat: false,
        show_variables: false,
        apply_variables: true,
      };
    
    case 'manual-with-hidden-variables':
      return {
        auto_run: false,
        allow_chat: true,
        show_variables: false,
        apply_variables: true,
      };
    
    case 'manual-with-visible-variables':
      return {
        auto_run: false,
        allow_chat: true,
        show_variables: true,
        apply_variables: true,
      };
    
    case 'manual':
    default:
      return {
        auto_run: false,
        allow_chat: true,
        show_variables: false,
        apply_variables: false,
      };
  }
}

