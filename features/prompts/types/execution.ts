/**
 * Types for programmatic prompt execution system
 * 
 * This module provides type definitions for executing prompts programmatically
 * from anywhere in the application with flexible input and output handling.
 */

import { PromptMessage, PromptsData } from "@/features/prompts/types/core";

// ============================================================================
// Variable Input Sources
// ============================================================================

/**
 * Defines where a variable's value comes from
 */
export type VariableSource = 
  | { type: 'hardcoded'; value: string }
  | { type: 'runtime'; getValue: () => string | Promise<string> }
  | { type: 'function'; fn: (context?: any) => string | Promise<string> }
  | { type: 'user-input'; prompt?: string; default?: string }
  | { type: 'context'; path: string } // e.g., "user.name" or "selection.text"
  | { type: 'previous-result'; resultPath?: string }
  | { type: 'redux'; selector: (state: any) => string }
  | { type: 'broker'; brokerId: string };

/**
 * Map of variable names to their sources
 */
export type VariableSourceMap = Record<string, VariableSource>;

// ============================================================================
// Output Handling
// ============================================================================

/**
 * Defines how to handle the prompt execution result
 */
export type OutputHandler =
  | { type: 'markdown'; onComplete?: (html: string) => void }
  | { type: 'plain-text'; onComplete?: (text: string) => void }
  | { type: 'json'; schema?: any; onComplete?: (data: any) => void }
  | { type: 'stream'; onChunk: (chunk: string) => void; onComplete?: (fullText: string) => void }
  | { type: 'redux'; action: string; transform?: (text: string) => any }
  | { type: 'canvas'; options?: { title?: string; type?: string } }
  | { type: 'toast'; successMessage?: string }
  | { type: 'custom'; handler: (result: ExecutionResult) => void | Promise<void> };

// ============================================================================
// Execution Configuration
// ============================================================================

/**
 * Configuration for executing a prompt programmatically
 */
export interface PromptExecutionConfig {
  /** ID of the prompt to execute (will fetch from database) */
  promptId?: string;
  
  /** Full prompt data object (skips fetch if provided) - accepts PromptsData or PromptExecutionData */
  promptData?: PromptsData | PromptExecutionData;
  
  /** Variable value sources */
  variables?: VariableSourceMap;
  
  /** Optional user input content (not required) */
  userInput?: string | (() => string | Promise<string>);
  
  /** How to handle the output */
  output?: OutputHandler;
  
  /** Optional context data available to functions and resolvers */
  context?: any;
  
  /** Model overrides */
  modelConfig?: {
    modelId?: string;
    model_id?: string;
    temperature?: number;
    maxTokens?: number;
    max_tokens?: number;
    [key: string]: any;
  };
  
  /** Whether to track in AI runs (default: true) */
  trackInRuns?: boolean;
  
  /** Optional name for the run */
  runName?: string;
  
  /** Whether to show loading UI (default: true) */
  showLoading?: boolean;
  
  /** Callback for execution progress */
  onProgress?: (progress: ExecutionProgress) => void;
  
  /** Callback for errors */
  onError?: (error: ExecutionError) => void;
}

// ============================================================================
// Execution State & Results
// ============================================================================

/**
 * Progress information during execution
 */
export interface ExecutionProgress {
  status: 'initializing' | 'resolving-variables' | 'executing' | 'streaming' | 'processing-output' | 'complete';
  message?: string;
  streamedText?: string;
  percentage?: number;
}

/**
 * Error during execution
 */
export interface ExecutionError {
  stage: 'variable-resolution' | 'prompt-fetch' | 'execution' | 'output-processing';
  message: string;
  details?: any;
}

/**
 * Result of a prompt execution
 */
export interface ExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  
  /** The full response text */
  text: string;
  
  /** Parsed data if output type was 'json' */
  data?: any;
  
  /** Execution metadata */
  metadata: {
    promptId: string;
    promptName: string;
    runId?: string;
    taskId: string;
    duration: number;
    tokens?: number;
    cost?: number;
    model?: string;
    timeToFirstToken?: number;
  };
  
  /** Any errors that occurred */
  error?: ExecutionError;
  
  /** Resolved variable values used */
  resolvedVariables: Record<string, string>;
}

// ============================================================================
// Button Component Props
// ============================================================================

/**
 * Props for the PromptExecutionButton component
 */
export interface PromptExecutionButtonProps {
  /** Prompt execution configuration */
  config: PromptExecutionConfig;
  
  /** Button label */
  label?: string;
  
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  
  /** Optional icon (Lucide React component) */
  icon?: React.ComponentType<{ className?: string }>;
  
  /** Whether button should be full width */
  fullWidth?: boolean;
  
  /** Custom className */
  className?: string;
  
  /** Whether to disable button */
  disabled?: boolean;
  
  /** Tooltip text */
  tooltip?: string;
  
  /** Callback when execution starts */
  onExecutionStart?: () => void;
  
  /** Callback when execution completes */
  onExecutionComplete?: (result: ExecutionResult) => void;
}

// ============================================================================
// Context Menu Props
// ============================================================================

/**
 * Configuration for a single context menu prompt option
 */
export interface ContextMenuPromptOption {
  /** Display label */
  label: string;
  
  /** Optional icon */
  icon?: React.ComponentType<{ className?: string }>;
  
  /** Prompt configuration */
  config: Omit<PromptExecutionConfig, 'context'>;
  
  /** Whether to show in context menu (can be function for dynamic visibility) */
  visible?: boolean | ((context: any) => boolean);
  
  /** Optional grouping */
  group?: string;
}

/**
 * Props for the PromptContextMenu component
 */
export interface PromptContextMenuProps {
  /** Available prompt options */
  options: ContextMenuPromptOption[];
  
  /** Context data to pass to prompts */
  context: any;
  
  /** Children to wrap with context menu */
  children: React.ReactNode;
  
  /** Custom menu className */
  className?: string;
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for usePromptExecution hook
 */
export interface UsePromptExecutionReturn {
  /** Execute a prompt with the given configuration */
  execute: (config: PromptExecutionConfig) => Promise<ExecutionResult>;
  
  /** Current execution state */
  isExecuting: boolean;
  
  /** Streaming text from current execution */
  streamingText: string;
  
  /** Current task ID */
  currentTaskId: string | null;
  
  /** Whether the response has ended */
  isResponseEnded: boolean;
  
  /** Current progress */
  progress?: ExecutionProgress | null;
  
  /** Latest result */
  result?: ExecutionResult | null;
  
  /** Latest error */
  error: string | null;
  
  /** Reset state */
  reset: () => void;
  
  /** Cancel current execution */
  cancel?: () => void;
}

// ============================================================================
// Prompt Metadata
// ============================================================================

/**
 * Simplified prompt data for execution
 */
export interface PromptExecutionData {
  id: string;
  name: string;
  messages: PromptMessage[];
  variables?: string[]; // Extracted variable names (optional - extracted from messages if not provided)
  settings: Record<string, any>;
  variableDefaults?: Array<{ name: string; defaultValue: string }>;
}

