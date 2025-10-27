// ============================================================================
// AI RUNS - TypeScript Type Definitions
// ============================================================================
// Matches the database schema for ai_runs and ai_tasks tables
// ============================================================================

// ----------------------------------------------------------------------------
// Enums
// ----------------------------------------------------------------------------

export type SourceType = 'prompt' | 'chat' | 'applet' | 'cockpit' | 'workflow' | 'custom';

export type RunStatus = 'active' | 'archived' | 'deleted';

export type TaskStatus = 'pending' | 'streaming' | 'completed' | 'failed' | 'cancelled';

export type AttachmentType = 'file' | 'url' | 'image' | 'youtube';

// ----------------------------------------------------------------------------
// Message Types
// ----------------------------------------------------------------------------

export interface RunMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  taskId?: string;
  timestamp: string | Date;
  metadata?: {
    tokens?: number;
    cost?: number;
    timeToFirstToken?: number;
    totalTime?: number;
    [key: string]: any;
  };
}

// ----------------------------------------------------------------------------
// Attachment Types
// ----------------------------------------------------------------------------

export interface Attachment {
  type: AttachmentType;
  url: string;
  name: string;
  metadata?: {
    size?: number;
    mimeType?: string;
    [key: string]: any;
  };
}

// ----------------------------------------------------------------------------
// AI Run Types
// ----------------------------------------------------------------------------

export interface AiRun {
  id: string;
  user_id: string;
  source_type: SourceType;
  source_id?: string | null;
  name?: string | null;
  description?: string | null;
  tags: string[];
  messages: RunMessage[];
  settings: Record<string, any>;
  variable_values: Record<string, string>;
  broker_values: Record<string, string>;
  attachments: Attachment[];
  metadata: Record<string, any>;
  status: RunStatus;
  is_starred: boolean;
  total_tokens: number;
  total_cost: number;
  message_count: number;
  task_count: number;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface CreateAiRunInput {
  source_type: SourceType;
  source_id?: string;
  name?: string;
  description?: string;
  tags?: string[];
  settings: Record<string, any>;
  variable_values?: Record<string, string>;
  broker_values?: Record<string, string>;
  attachments?: Attachment[];
  metadata?: Record<string, any>;
}

export interface UpdateAiRunInput {
  name?: string;
  description?: string;
  tags?: string[];
  messages?: RunMessage[];
  settings?: Record<string, any>;
  variable_values?: Record<string, string>;
  broker_values?: Record<string, string>;
  attachments?: Attachment[];
  metadata?: Record<string, any>;
  status?: RunStatus;
  is_starred?: boolean;
}

// ----------------------------------------------------------------------------
// AI Task Types
// ----------------------------------------------------------------------------

export interface AiTask {
  id: string;
  run_id: string;
  user_id: string;
  task_id: string; // Socket.io task ID
  service: string;
  task_name: string;
  provider?: string | null;
  endpoint?: string | null;
  model?: string | null;
  model_id?: string | null;
  request_data: Record<string, any>;
  response_text?: string | null;
  response_data?: Record<string, any> | null;
  response_info?: Record<string, any> | null;
  response_errors?: Record<string, any> | null;
  tool_updates?: Record<string, any> | null;
  response_complete: boolean;
  response_metadata: Record<string, any>;
  tokens_input?: number | null;
  tokens_output?: number | null;
  tokens_total?: number | null;
  cost?: number | null;
  time_to_first_token?: number | null;
  total_time?: number | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface CreateAiTaskInput {
  run_id: string;
  task_id: string; // Must match socket.io task ID
  service: string;
  task_name: string;
  provider?: string;
  endpoint?: string;
  model?: string;
  model_id?: string;
  request_data: Record<string, any>;
}

// For use with useAiRun hook - run_id is added automatically
export interface CreateTaskInput {
  task_id: string; // Must match socket.io task ID
  service: string;
  task_name: string;
  provider?: string;
  endpoint?: string;
  model?: string;
  model_id?: string;
  request_data: Record<string, any>;
}

export interface UpdateAiTaskInput {
  response_text?: string;
  response_data?: Record<string, any>;
  response_info?: Record<string, any>;
  response_errors?: Record<string, any>;
  tool_updates?: Record<string, any>;
  response_complete?: boolean;
  response_metadata?: Record<string, any>;
  tokens_input?: number;
  tokens_output?: number;
  tokens_total?: number;
  cost?: number;
  time_to_first_token?: number;
  total_time?: number;
  status?: TaskStatus;
}

export interface CompleteAiTaskInput {
  response_text: string;
  response_data?: Record<string, any>;
  response_metadata?: Record<string, any>;
  tokens_input?: number;
  tokens_output?: number;
  tokens_total: number;
  cost?: number;
  time_to_first_token?: number;
  total_time: number;
}

// ----------------------------------------------------------------------------
// Combined Types
// ----------------------------------------------------------------------------

export interface AiRunWithTasks extends AiRun {
  tasks: AiTask[];
}

// ----------------------------------------------------------------------------
// List/Filter Types
// ----------------------------------------------------------------------------

export interface AiRunsListFilters {
  source_type?: SourceType;
  source_id?: string;
  status?: RunStatus;
  starred?: boolean;
  search?: string; // Search in name/description
  limit?: number;
  offset?: number;
  order_by?: 'last_message_at' | 'created_at' | 'name';
  order_direction?: 'asc' | 'desc';
}

export interface AiRunsListResponse {
  runs: AiRun[];
  total: number;
  hasMore: boolean;
}

// ----------------------------------------------------------------------------
// Summary Types (from views)
// ----------------------------------------------------------------------------

export interface AiRunSummary {
  id: string;
  name: string | null;
  source_type: SourceType;
  source_id: string | null;
  message_count: number;
  task_count: number;
  total_tokens: number;
  total_cost: number;
  is_starred: boolean;
  status: RunStatus;
  created_at: string;
  last_message_at: string;
  user_id: string;
}

export interface TaskAnalytics {
  user_id: string;
  service: string;
  task_name: string;
  total_tasks: number;
  avg_total_time: number;
  avg_time_to_first_token: number;
  total_tokens: number;
  total_cost: number;
  day: string;
}

// ----------------------------------------------------------------------------
// Hook Return Types
// ----------------------------------------------------------------------------

export interface UseAiRunReturn {
  run: AiRun | null;
  tasks: AiTask[];
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  
  // Run actions
  createRun: (input: CreateAiRunInput) => Promise<AiRun>;
  updateRun: (input: UpdateAiRunInput) => Promise<AiRun>;
  deleteRun: () => Promise<void>;
  toggleStar: () => Promise<void>;
  addMessage: (message: RunMessage, overrideRunId?: string) => Promise<AiRun>;
  
  // Task actions (run_id is added automatically by the hook)
  createTask: (input: CreateTaskInput, overrideRunId?: string) => Promise<AiTask>;
  updateTask: (taskId: string, input: UpdateAiTaskInput) => Promise<AiTask>;
  completeTask: (taskId: string, input: CompleteAiTaskInput) => Promise<AiTask>;
}

export interface UseAiRunsListReturn {
  runs: AiRun[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  total: number;
  
  // Actions
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setFilters: (filters: Partial<AiRunsListFilters>) => void;
}

