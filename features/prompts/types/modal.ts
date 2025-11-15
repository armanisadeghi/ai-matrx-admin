/**
 * PromptRunnerModal Types
 * 
 * Type definitions for the modal-based prompt runner system
 */

import { PromptVariable, PromptMessage } from "@/features/prompts/types/core";

// ============================================================================
// Execution Modes
// ============================================================================

/**
 * Execution mode determines how the modal behaves
 * 
 * - auto-run: Automatically starts execution with pre-filled variables, allows conversation
 * - auto-run-one-shot: Automatically starts execution, no follow-up conversation
 * - manual-with-hidden-variables: User can add instructions, variables are hidden
 * - manual-with-visible-variables: User can edit variables and add instructions
 * - manual: Standard prompt runner behavior, no pre-filled values
 */
export type PromptExecutionMode = 
  | 'auto-run'
  | 'auto-run-one-shot'
  | 'manual-with-hidden-variables'
  | 'manual-with-visible-variables'
  | 'manual';

// auto-run: true/false (True = No Initial message)
// allow-chat: true/false (False = one-shot)
// show-variables: true/false (False = variables are hidden, but still applied if available)
// manual: True = no variables applied.


export interface PromptRunnerModalProps {
  /** Controls whether the modal is open */
  isOpen: boolean;
  
  /** Callback when modal should close */
  onClose: () => void;
  
  /** Either prompt ID (will fetch) or full prompt object */
  promptId?: string;
  promptData?: PromptData;
  
  /** Execution mode */
  mode?: PromptExecutionMode;
  
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
  mode?: PromptExecutionMode;
  variables?: Record<string, string>;
  initialMessage?: string;
  title?: string;
  runId?: string;
  onExecutionComplete?: (result: ExecutionResult) => void;
}

