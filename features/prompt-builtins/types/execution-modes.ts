/**
 * Execution Configuration Types
 * 
 * Defines how LLM recipe execution results are displayed to the user.
 */

// ============================================================================
// Result Display Types
// ============================================================================

export type ResultDisplay = 
  | 'modal-full'      // Full modal with chat interface (PromptRunnerModal)
  | 'modal-compact'   // Compact modal with essential controls only
  | 'inline'          // Minimal overlay with replace/insert/cancel (VSCode-style)
  | 'sidebar'         // Sidebar panel using FloatingSheet component
  | 'flexible-panel'  // Advanced resizable panel with position controls (MatrxDynamicPanel)
  | 'toast'           // Toast notification for simple responses
  | 'direct'          // Streams directly to target location (no intermediate UI)
  | 'background';     // Silent execution, state-only updates (automation)

export const RESULT_DISPLAY_META = {
  'modal-full': {
    label: 'Full Modal',
    description: 'Full-featured modal dialog with chat interface and history',
    icon: 'Square',
    color: 'text-purple-600 dark:text-purple-400',
    useCases: ['Complex interactions', 'Multi-turn conversations', 'Review before action'],
    testMode: false,
  },
  'modal-compact': {
    label: 'Compact Modal',
    description: 'Streamlined modal with essential controls and preview',
    icon: 'RectangleVertical',
    color: 'text-blue-600 dark:text-blue-400',
    useCases: ['Quick edits', 'Single responses', 'Simple previews'],
    testMode: false,
  },
  inline: {
    label: 'Inline',
    description: 'Minimal overlay at cursor/selection with immediate action options',
    icon: 'FileEdit',
    color: 'text-amber-600 dark:text-amber-400',
    useCases: ['Text manipulation', 'In-place edits', 'Quick replacements'],
    testMode: true,
  },
  sidebar: {
    label: 'Sidebar',
    description: 'Persistent sidebar panel (FloatingSheet) with contextual results',
    icon: 'PanelRight',
    color: 'text-teal-600 dark:text-teal-400',
    useCases: ['Parallel workflows', 'Reference while working', 'Multi-document tasks'],
    testMode: false,
  },
  'flexible-panel': {
    label: 'Flexible Panel',
    description: 'Advanced resizable panel with full position control and fullscreen mode',
    icon: 'Maximize2',
    color: 'text-emerald-600 dark:text-emerald-400',
    useCases: ['Complex workflows', 'Full customization', 'Multi-position support', 'Adjustable sizing'],
    testMode: false,
  },
  toast: {
    label: 'Toast',
    description: 'Brief notification with result summary or confirmation',
    icon: 'BellRing',
    color: 'text-orange-600 dark:text-orange-400',
    useCases: ['Simple confirmations', 'Status updates', 'Quick answers'],
    testMode: false,
  },
  direct: {
    label: 'Direct Stream',
    description: 'Streams output directly to target component with no intermediate UI',
    icon: 'ArrowRight',
    color: 'text-cyan-600 dark:text-cyan-400',
    useCases: ['Live updates', 'Real-time collaboration', 'Embedded outputs'],
    testMode: true,
  },
  background: {
    label: 'Background',
    description: 'Silent execution with state updates only, no UI shown',
    icon: 'Loader',
    color: 'text-slate-600 dark:text-slate-400',
    useCases: ['Automation', 'Batch processing', 'Pre-computation'],
    testMode: true,
  },
} as const;

export const hasVisibleUI = (display: ResultDisplay): boolean => {
  return display !== 'background' && display !== 'direct';
};

export const isInteractive = (display: ResultDisplay): boolean => {
  return display === 'modal-full' || display === 'modal-compact' || display === 'sidebar';
};

// ============================================================================
// Execution Configuration
// ============================================================================

export interface PromptExecutionConfig {
  result_display: ResultDisplay;
  auto_run: boolean;
  allow_chat: boolean;
  show_variables: boolean;
  apply_variables: boolean;
  track_in_runs: boolean;
  use_pre_execution_input: boolean; // Show input modal before execution
}

export const DEFAULT_EXECUTION_CONFIG: PromptExecutionConfig = {
  result_display: 'modal-full',
  auto_run: true,
  allow_chat: true,
  show_variables: false,
  apply_variables: true,
  track_in_runs: true,
  use_pre_execution_input: false,
};

export function parseExecutionConfig(
  result_display?: string | null,
  auto_run?: boolean | null,
  allow_chat?: boolean | null,
  show_variables?: boolean | null,
  apply_variables?: boolean | null,
  track_in_runs?: boolean | null,
  use_pre_execution_input?: boolean | null
): PromptExecutionConfig {
  return {
    result_display: (result_display as ResultDisplay) || DEFAULT_EXECUTION_CONFIG.result_display,
    auto_run: auto_run ?? DEFAULT_EXECUTION_CONFIG.auto_run,
    allow_chat: allow_chat ?? DEFAULT_EXECUTION_CONFIG.allow_chat,
    show_variables: show_variables ?? DEFAULT_EXECUTION_CONFIG.show_variables,
    apply_variables: apply_variables ?? DEFAULT_EXECUTION_CONFIG.apply_variables,
    track_in_runs: track_in_runs ?? DEFAULT_EXECUTION_CONFIG.track_in_runs,
    use_pre_execution_input: use_pre_execution_input ?? DEFAULT_EXECUTION_CONFIG.use_pre_execution_input,
  };
}

export function requiresModalUI(display: ResultDisplay): boolean {
  return display === 'modal-full' || display === 'modal-compact' || display === 'sidebar';
}

export function requiresInlineUI(display: ResultDisplay): boolean {
  return display === 'inline';
}

export function showsResults(display: ResultDisplay): boolean {
  return display !== 'background';
}

/**
 * Get all display types as an array
 */
export function getAllDisplayTypes(): ResultDisplay[] {
  return Object.keys(RESULT_DISPLAY_META) as ResultDisplay[];
}

/**
 * Get metadata for a specific display type
 */
export function getDisplayMeta(display: ResultDisplay) {
  return RESULT_DISPLAY_META[display];
}

/**
 * Check if a display type requires test mode UI
 */
export function isTestMode(display: ResultDisplay): boolean {
  return RESULT_DISPLAY_META[display].testMode;
}