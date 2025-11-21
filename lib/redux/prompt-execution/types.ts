/**
 * Prompt Execution Engine - Type Definitions
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
  runId: string | null;
  sourceType: string;
  sourceId: string;
  runName: string | null;
  totalTokens: number;
  totalCost: number;
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
 * Core execution instance
 * Represents a single prompt execution session (may have multiple messages)
 */
export interface ExecutionInstance {
  // ========== Identity ==========
  instanceId: string;       // UUID - created on init
  promptId: string;         // Reference to cached prompt
  promptSource: 'prompts' | 'prompt_builtins'; // Which table the prompt came from
  
  // ========== Status ==========
  status: ExecutionStatus;
  error: string | null;
  createdAt: number;
  updatedAt: number;
  
  // ========== Configuration ==========
  settings: Record<string, any>;     // Model config from prompt
  executionConfig: ExecutionConfig;
  
  // ========== Variables ==========
  variables: ExecutionVariables;
  
  // ========== Conversation ==========
  conversation: {
    messages: ConversationMessage[];
    currentInput: string;          // User's current message being composed
    resources: any[];              // Attachments/files
  };
  
  // ========== Execution Tracking ==========
  execution: ExecutionTracking;
  
  // ========== Run Tracking (DB) ==========
  runTracking: RunTracking;
  
  // ========== UI State (optional) ==========
  ui: {
    expandedVariable: string | null;
    showVariables: boolean;
  };
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
 */
export interface PromptExecutionState {
  // All active instances (keyed by instanceId)
  instances: {
    [instanceId: string]: ExecutionInstance;
  };
  
  // Quick lookup maps
  instancesByPromptId: {
    [promptId: string]: string[]; // instanceIds
  };
  instancesByRunId: {
    [runId: string]: string; // instanceId
  };
  
  // Scoped variables cache (fetched once per session)
  scopedVariables: ScopedVariables;
}

/**
 * Thunk payloads
 */

export interface StartInstancePayload {
  promptId: string;
  promptSource?: 'prompts' | 'prompt_builtins'; // Optional: defaults to 'prompts'
  executionConfig?: Partial<ExecutionConfig>;
  variables?: Record<string, string>;
  initialMessage?: string;
  runId?: string; // Optional: for loading existing run
}

export interface ExecuteMessagePayload {
  instanceId: string;
  userInput?: string;  // Additional input to append
}

export interface CompleteExecutionPayload {
  instanceId: string;
}

export interface UpdateVariablePayload {
  instanceId: string;
  variableName: string;
  value: string;
}

export interface SetCurrentInputPayload {
  instanceId: string;
  input: string;
}

export interface FetchScopedVariablesPayload {
  userId: string;
  orgId?: string;
  projectId?: string;
  force?: boolean; // Force refetch even if cached
}

