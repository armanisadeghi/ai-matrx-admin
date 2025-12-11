/**
 * Types for Prompt Actions system
 * 
 * Actions wrap prompts to provide context-aware execution with broker integration
 */

/**
 * Execution configuration for a prompt action
 */
export interface ActionExecutionConfig {
  /** Whether to auto-run the action without user confirmation */
  auto_run: boolean;

  /** Whether to allow continued conversation after initial execution */
  allow_chat: boolean;

  /** Whether to show variable inputs to the user (false = auto-fill only) */
  show_variables: boolean;

  /** Whether to apply variable replacements before execution */
  apply_variables: boolean;

  /** How to display the result ('modal-full', 'modal', 'sidebar', 'inline', etc.) */
  result_display: string;

  /** Whether to track execution in ai_runs and ai_tasks tables */
  track_in_runs: boolean;

  /** Whether to show the pre-execution input modal before execution */
  use_pre_execution_input: boolean;
}

/**
 * Complete Prompt Action definition from database
 */
export interface PromptAction {
  id: string;
  created_at: string;
  updated_at: string;

  // Basic info
  name: string;
  description: string | null;

  // Prompt reference (either user prompt OR builtin, not both)
  prompt_id: string | null;
  prompt_builtin_id: string | null;

  // Broker integration
  /** Map of variable name to broker ID: {"client_name": "broker-uuid-company-name"} */
  broker_mappings: Record<string, string>;

  /** Hardcoded overrides that always apply: {"tone": "professional"} */
  hardcoded_values: Record<string, string>;

  /** Context scopes this action expects/requires: ['workspace', 'project', 'task'] */
  context_scopes: string[];

  // Execution configuration
  execution_config: ActionExecutionConfig;

  // Metadata
  user_id: string | null;
  is_public: boolean;
  tags: string[];
  icon_name: string | null;
  is_active: boolean;
}

/**
 * Payload for creating a new action
 */
export interface CreateActionPayload {
  name: string;
  description?: string;

  // Must provide one (not both)
  prompt_id?: string;
  prompt_builtin_id?: string;

  broker_mappings?: Record<string, string>;
  hardcoded_values?: Record<string, string>;
  context_scopes?: string[];

  execution_config?: Partial<ActionExecutionConfig>;

  tags?: string[];
  icon_name?: string;
  is_public?: boolean;
}

/**
 * Payload for updating an existing action
 */
export interface UpdateActionPayload {
  name?: string;
  description?: string;

  broker_mappings?: Record<string, string>;
  hardcoded_values?: Record<string, string>;
  context_scopes?: string[];

  execution_config?: Partial<ActionExecutionConfig>;

  tags?: string[];
  icon_name?: string;
  is_public?: boolean;
  is_active?: boolean;
}

/**
 * Context for executing an action
 * Provides all IDs needed for broker resolution
 */
export interface ExecuteActionContext {
  /** Current user ID (required) */
  userId: string;

  /** Organization ID */
  organizationId?: string;

  /** Workspace ID */
  workspaceId?: string;

  /** Project ID */
  projectId?: string;

  /** Task ID */
  taskId?: string;

  /** AI Run ID (if part of existing conversation) */
  aiRunId?: string;

  /** AI Task ID (if part of existing API call) */
  aiTaskId?: string;
}

/**
 * Result of action execution
 */
export interface ActionExecutionResult {
  /** Run ID (serves as both instance identifier and database run ID) */
  runId: string;

  /** Number of variables resolved from brokers */
  brokerResolvedCount: number;

  /** Number of variables provided by user */
  userProvidedCount: number;

  /** Total variables in prompt */
  totalVariableCount: number;

  /** Whether all required variables were resolved */
  fullyResolved: boolean;
}

/**
 * Lightweight action summary (for lists/selectors)
 */
export interface ActionSummary {
  id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  tags: string[];
  prompt_id: string | null;
  prompt_builtin_id: string | null;
  context_scopes: string[];
  is_public: boolean;
}

/**
 * Action with related data (for detailed views)
 */
export interface ActionWithRelations extends PromptAction {
  /** Prompt data if loaded */
  prompt?: {
    id: string;
    name: string;
    description: string | null;
  };

  /** Broker data if loaded */
  brokers?: Array<{
    id: string;
    name: string;
    data_type: string;
  }>;
}

