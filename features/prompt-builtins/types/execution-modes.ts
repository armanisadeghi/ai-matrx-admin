/**
 * Execution Configuration Types
 * 
 * Defines how LLM recipe execution results are displayed to the user.
 */

// ============================================================================
// Result Display Types
// ============================================================================

export type ResultDisplay = 
  | 'modal-full'    // Full modal with chat interface (PromptRunnerModal)
  | 'modal-compact' // Compact modal with essential controls only
  | 'inline'        // Minimal overlay with replace/insert/cancel (VSCode-style)
  | 'sidebar'       // Sidebar panel using FloatingSheet component
  | 'toast'         // Toast notification for simple responses
  | 'direct'        // Streams directly to target location (no intermediate UI)
  | 'background';   // Silent execution, state-only updates (automation)

export const RESULT_DISPLAY_META = {
  'modal-full': {
    label: 'Full Modal',
    description: 'Full-featured modal dialog with chat interface and history',
    icon: 'Square',
    useCases: ['Complex interactions', 'Multi-turn conversations', 'Review before action'],
  },
  'modal-compact': {
    label: 'Compact Modal',
    description: 'Streamlined modal with essential controls and preview',
    icon: 'RectangleVertical',
    useCases: ['Quick edits', 'Single responses', 'Simple previews'],
  },
  inline: {
    label: 'Inline',
    description: 'Minimal overlay at cursor/selection with immediate action options',
    icon: 'FileEdit',
    useCases: ['Text manipulation', 'In-place edits', 'Quick replacements'],
  },
  sidebar: {
    label: 'Sidebar',
    description: 'Persistent sidebar panel (FloatingSheet) with contextual results',
    icon: 'PanelRight',
    useCases: ['Parallel workflows', 'Reference while working', 'Multi-document tasks'],
  },
  toast: {
    label: 'Toast',
    description: 'Brief notification with result summary or confirmation',
    icon: 'MessageSquare',
    useCases: ['Simple confirmations', 'Status updates', 'Quick answers'],
  },
  direct: {
    label: 'Direct Stream',
    description: 'Streams output directly to target component with no intermediate UI',
    icon: 'Zap',
    useCases: ['Live updates', 'Real-time collaboration', 'Embedded outputs'],
  },
  background: {
    label: 'Background',
    description: 'Silent execution with state updates only, no UI shown',
    icon: 'Loader',
    useCases: ['Automation', 'Batch processing', 'Pre-computation'],
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
}

export const DEFAULT_EXECUTION_CONFIG: PromptExecutionConfig = {
  result_display: 'modal-full',
  auto_run: true,
  allow_chat: true,
  show_variables: false,
  apply_variables: true,
};

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

export function requiresModalUI(display: ResultDisplay): boolean {
  return display === 'modal-full' || display === 'modal-compact' || display === 'sidebar';
}

export function requiresInlineUI(display: ResultDisplay): boolean {
  return display === 'inline';
}

export function showsResults(display: ResultDisplay): boolean {
  return display !== 'background';
}

// ============================================================================
// Legacy Mode Conversion
// ============================================================================

export type LegacyPromptExecutionMode = 
  | 'auto-run'
  | 'auto-run-one-shot'
  | 'manual-with-hidden-variables'
  | 'manual-with-visible-variables'
  | 'manual';

export function convertLegacyModeToConfig(mode: LegacyPromptExecutionMode): Omit<PromptExecutionConfig, 'result_display'> {
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

export function convertConfigToLegacyMode(config: Omit<PromptExecutionConfig, 'result_display'>): LegacyPromptExecutionMode {
  if (config.auto_run && config.allow_chat && !config.show_variables && config.apply_variables) {
    return 'auto-run';
  }
  
  if (config.auto_run && !config.allow_chat && !config.show_variables && config.apply_variables) {
    return 'auto-run-one-shot';
  }
  
  if (!config.auto_run && config.allow_chat && !config.show_variables && config.apply_variables) {
    return 'manual-with-hidden-variables';
  }
  
  if (!config.auto_run && config.allow_chat && config.show_variables && config.apply_variables) {
    return 'manual-with-visible-variables';
  }
  
  return 'manual';
}