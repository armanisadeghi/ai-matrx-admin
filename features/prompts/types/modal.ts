/**
 * PromptRunnerModal Types
 * 
 * Type definitions for the modal-based prompt runner system
 */

import { PromptVariable, PromptMessage } from "@/features/prompts/types/core";
import type { 
  PromptExecutionConfig as NewExecutionConfig,
  ResultDisplay
} from "@/features/prompt-builtins/types/execution-modes";

// Re-export new types for convenience
export type { NewExecutionConfig, ResultDisplay };

/**
 * Execution configuration for prompt runner
 */
export interface PromptExecutionConfiguration {
  /** Execution configuration */
  executionConfig?: Omit<NewExecutionConfig, 'result_display'>;
  
  /** Auto-run flag (can be used directly for simple cases) */
  autoRun?: boolean;
  
  /** Allow chat flag (can be used directly for simple cases) */
  allowChat?: boolean;
  
  /** Show variables flag (can be used directly for simple cases) */
  showVariables?: boolean;
  
  /** Apply variables flag (can be used directly for simple cases) */
  applyVariables?: boolean;
}

export interface PromptRunnerModalProps {
  /** Controls whether the modal is open */
  isOpen: boolean;
  
  /** Callback when modal should close */
  onClose: () => void;
  
  /** Either prompt ID (will fetch) or full prompt object */
  promptId?: string;
  promptData?: PromptData;
  
  /** Execution configuration */
  executionConfig?: Omit<NewExecutionConfig, 'result_display'>;
  
  /** Display variant for PromptRunner (standard | compact) */
  displayVariant?: 'standard' | 'compact';
  
  /** Pre-filled variable values */
  variables?: Record<string, string>;
  
  /** Optional initial user message (for auto-run mode) */
  initialMessage?: string;
  
  /** Optional callback when execution completes */
  onExecutionComplete?: (result: ExecutionResult) => void;
  
  /** Optional custom title */
  title?: string;
  
  /** Optional run ID to load existing conversation */
  runId?: string;
  
  /** Optional custom message for AdditionalInfoModal */
  customMessage?: string;
}

/**
 * Prompt data structure (matches database schema)
 */
export interface PromptData {
  id: string;
  name: string;
  description?: string;
  messages: PromptMessage[];
  variableDefaults?: PromptVariable[];
  variable_defaults?: PromptVariable[]; // Alternative naming from DB
  settings: Record<string, any>;
}

/**
 * Result returned after execution
 */
export interface ExecutionResult {
  runId: string;
  response: string;
  metadata?: {
    tokens?: number;
    cost?: number;
    timeToFirstToken?: number;
    totalTime?: number;
  };
}

/**
 * Hook return type for usePromptRunnerModal
 */
export interface UsePromptRunnerModalReturn {
  isOpen: boolean;
  open: (config: PromptRunnerModalConfig) => void;
  close: () => void;
  config: PromptRunnerModalConfig | null;
}

/**
 * Configuration passed to the modal hook
 */
export interface PromptRunnerModalConfig {
  promptId?: string;
  promptData?: PromptData;
  
  /** Execution configuration with separate flags */
  executionConfig?: Omit<NewExecutionConfig, 'result_display'>;
  
  /** Display variant for PromptRunner (standard | compact) */
  displayVariant?: 'standard' | 'compact';
  
  variables?: Record<string, string>;
  initialMessage?: string;
  title?: string;
  runId?: string;
  onExecutionComplete?: (result: ExecutionResult) => void;
  customMessage?: string;
}

/**
 * Unified prompt execution request
 * This is the new single entry point for executing prompts
 */
export interface PromptExecutionRequest {
  /** Prompt identifier or data */
  promptId?: string;
  promptData?: PromptData;
  
  /** Full execution configuration including display type */
  config: NewExecutionConfig;
  
  /** Pre-filled variable values */
  variables?: Record<string, string>;
  
  /** Optional initial user message */
  initialMessage?: string;
  
  /** Optional custom title */
  title?: string;
  
  /** Optional run ID to load existing conversation */
  runId?: string;
  
  /** Optional callback when execution completes */
  onExecutionComplete?: (result: ExecutionResult) => void;
  
  /** Optional custom message for AdditionalInfoModal */
  customMessage?: string;
}

// ============================================================================
// Conversion Utilities
// ============================================================================

/**
 * Resolve execution config from various input formats
 * Handles new config or individual flags
 */
export function resolveExecutionConfig(
  config?: Omit<NewExecutionConfig, 'result_display'>,
  individualFlags?: {
    autoRun?: boolean;
    allowChat?: boolean;
    showVariables?: boolean;
    applyVariables?: boolean;
  }
): Omit<NewExecutionConfig, 'result_display'> {
  // Priority: config > individualFlags > defaults
  
  if (config) {
    return config;
  }
  
  if (individualFlags && Object.keys(individualFlags).length > 0) {
    return {
      auto_run: individualFlags.autoRun ?? true,
      allow_chat: individualFlags.allowChat ?? true,
      show_variables: individualFlags.showVariables ?? false,
      apply_variables: individualFlags.applyVariables ?? true,
    };
  }
  
  // Default: modal-full behavior
  return {
    auto_run: true,
    allow_chat: true,
    show_variables: false,
    apply_variables: true,
  };
}

/**
 * Convert PromptRunnerModalConfig to the resolved execution config
 */
export function getExecutionConfigFromModalConfig(
  modalConfig: PromptRunnerModalConfig
): Omit<NewExecutionConfig, 'result_display'> {
  return resolveExecutionConfig(modalConfig.executionConfig);
}

