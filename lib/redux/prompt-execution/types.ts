/**
 * Prompt Execution Engine - Type Definitions
 * 
 * ARCHITECTURE NOTES:
 * - ExecutionInstance contains stable data that rarely changes after creation
 * - High-frequency update data (currentInput, resources, uiState) live in separate top-level maps
 * - This separation prevents re-renders when typing in input fields
 */

export interface ExecutionConfig {
  auto_run: boolean;
  allow_chat: boolean;
  show_variables: boolean;
  apply_variables: boolean;
  track_in_runs: boolean;
}

export interface ExecutionVariables {
  // User-provided values (from UI)
  userValues: Record<string, string>;
  
  // Scoped variables (fetched from DB - user/org/project level)
  scopedValues: Record<string, string>;
  
  // Runtime computed variables (e.g., current_date, user_timezone)
  computedValues: Record<string, string>;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  taskId?: string;
  timestamp: string;
  metadata?: {
    timeToFirstToken?: number;
    totalTime?: number;
    tokens?: number;
    cost?: number;
    [key: string]: any;
  };
}

export interface ExecutionTracking {
  currentTaskId: string | null;
  messageStartTime: number | null;
  timeToFirstToken: number | undefined;
  lastMessageStats: {
    timeToFirstToken?: number;
    totalTime?: number;
    tokens?: number;
    cost?: number;
  } | null;
}

export interface RunTracking {
  sourceType: string;
  sourceId: string;
  runName: string | null;
  totalTokens: number;
  totalCost: number;
  savedToDatabase: boolean;
}

export type ExecutionStatus = 
  | 'idle'           // Created but not started
  | 'initializing'   // Loading prompt/variables
  | 'ready'          // Ready to execute
  | 'executing'      // Sending message
  | 'streaming'      // Receiving response
  | 'completed'      // Execution finished
  | 'error';         // Error occurred

/**
 * Core execution instance (Run)
 * 
 * Contains STABLE data that changes infrequently:
 * - Identity and configuration
 * - Message history (only changes during execution)
 * - Execution tracking
 * 
 * HIGH-FREQUENCY data lives in separate top-level maps:
 * - currentInputs[runId] - User typing
 * - resources[runId] - Attachments
 * - uiState[runId] - UI controls
 */
export interface ExecutionInstance {
  // ========== Identity ==========
  runId: string;
  promptId: string;
  promptSource: 'prompts' | 'prompt_builtins';
  
  // ========== Status ==========
  status: ExecutionStatus;
  error: string | null;
  
  // ========== Timestamps ==========
  /** Set once when instance is created */
  createdAt: number;
  /** Only updated when execution completes (message added to history) */
  updatedAt: number;
  
  // ========== Configuration ==========
  settings: Record<string, any>;
  executionConfig: ExecutionConfig;
  
  // ========== Variables ==========
  variables: ExecutionVariables;
  
  // ========== Messages ==========
  /** Conversation history - only changes during execution */
  messages: ConversationMessage[];
  
  // ========== Execution Tracking ==========
  execution: ExecutionTracking;
  
  // ========== Run Tracking (DB) ==========
  runTracking: RunTracking;
}

/**
 * UI state for an instance (isolated for performance)
 */
export interface InstanceUIState {
  expandedVariable: string | null;
  showVariables: boolean;
}

/**
 * Scoped variables fetched from database
 * These are user/org/project level variables that auto-populate
 */
export interface ScopedVariables {
  user: Record<string, string> | null;
  org: Record<string, string> | null;
  project: Record<string, string> | null;
  fetchedAt: number | null;
  status: 'idle' | 'loading' | 'loaded' | 'error';
}

/**
 * Main slice state
 * 
 * ARCHITECTURE:
 * - instances: Stable core data, changes only during execution
 * - currentInputs: Isolated input state, changes on every keystroke
 * - resources: Isolated attachments, changes on user interaction
 * - uiState: Isolated UI controls, changes on user interaction
 */
export interface PromptExecutionState {
  // Core instances (stable after creation)
  instances: {
    [runId: string]: ExecutionInstance;
  };
  
  // High-frequency update maps (isolated from instances)
  currentInputs: {
    [runId: string]: string;
  };
  
  resources: {
    [runId: string]: any[];
  };
  
  uiState: {
    [runId: string]: InstanceUIState;
  };
  
  // Quick lookup maps
  runsByPromptId: {
    [promptId: string]: string[];
  };
  
  // Scoped variables cache (fetched once per session)
  scopedVariables: ScopedVariables;
}

// ========== Thunk Payloads ==========

export interface StartInstancePayload {
  promptId: string;
  promptSource?: 'prompts' | 'prompt_builtins';
  executionConfig?: Partial<ExecutionConfig>;
  variables?: Record<string, string>;
  initialMessage?: string;
  runId?: string;
}

export interface ExecuteMessagePayload {
  runId: string;
  userInput?: string;
}

export interface CompleteExecutionPayload {
  runId: string;
}

export interface UpdateVariablePayload {
  runId: string;
  variableName: string;
  value: string;
}

export interface SetCurrentInputPayload {
  runId: string;
  input: string;
}

export interface FetchScopedVariablesPayload {
  userId: string;
  orgId?: string;
  projectId?: string;
  force?: boolean;
}
