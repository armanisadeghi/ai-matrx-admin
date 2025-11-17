// Enums matching your database types
export enum DataType {
  STR = 'str',
  INT = 'int',
  FLOAT = 'float',
  BOOL = 'bool',
  DATE = 'date',
  DATETIME = 'datetime',
  JSON = 'json',
  ARRAY = 'array',
}

export enum Color {
  BLUE = 'blue',
  RED = 'red',
  GREEN = 'green',
  YELLOW = 'yellow',
  PURPLE = 'purple',
  PINK = 'pink',
  ORANGE = 'orange',
  GRAY = 'gray',
}

export enum TaskStatus {
  INCOMPLETE = 'incomplete',
  COMPLETED = 'completed',
}

export enum AIRunStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export enum AIRunSourceType {
  PROMPT = 'prompt',
  CHAT = 'chat',
  APPLET = 'applet',
  COCKPIT = 'cockpit',
  WORKFLOW = 'workflow',
  CUSTOM = 'custom',
}

export enum AITaskStatus {
  PENDING = 'pending',
  STREAMING = 'streaming',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
  
// Core entity types
export interface DataBroker {
  id: string;
  name: string;
  data_type: DataType;
  default_value?: string | null;
  color?: Color | null;
  output_component?: string | null;
  field_component_id?: string | null;
  user_id?: string | null;
  created_at: string;
  updated_at: string;
  is_public?: boolean;
  authenticated_read?: boolean;
  public_read?: boolean;
  default_scope?: string | null;
  description?: string | null;
}
  
  export interface Organization {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    logo_url?: string | null;
    website?: string | null;
    created_at: string;
    updated_at: string;
    created_by?: string | null;
    is_personal?: boolean;
    settings?: Record<string, any>;
  }
  
  export interface Workspace {
    id: string;
    organization_id: string;
    parent_workspace_id?: string | null;
    name: string;
    description?: string | null;
    settings?: Record<string, any>;
    created_at: string;
    updated_at: string;
    created_by?: string | null;
  }
  
  export interface Project {
    id: string;
    workspace_id?: string | null;
    organization_id: string;
    name: string;
    description?: string | null;
    created_at: string;
    updated_at: string;
    created_by?: string | null;
    // Add other project fields as needed
  }
  
export interface Task {
  id: string;
  title: string;
  description?: string | null;
  project_id?: string | null;
  status: string;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string | null;
  authenticated_read?: boolean;
  parent_task_id?: string | null;
  priority?: string | null; // task_priority enum - type not defined in schema
  assignee_id?: string | null;
}
  
export interface AIRun {
  id: string;
  user_id: string;
  source_type: string;
  source_id?: string | null;
  name?: string | null;
  description?: string | null;
  tags?: string[];
  messages: any; // jsonb
  settings: Record<string, any>; // jsonb
  variable_values?: Record<string, any> | null; // jsonb
  broker_values?: Record<string, any> | null; // jsonb
  attachments?: any[]; // jsonb array
  metadata?: Record<string, any>; // jsonb
  status?: string;
  is_starred?: boolean;
  total_tokens?: number;
  total_cost?: number;
  message_count?: number;
  task_count?: number;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}
  
export interface AITask {
  id: string;
  run_id: string;
  user_id: string;
  task_id: string;
  service: string;
  task_name: string;
  provider?: string | null;
  endpoint?: string | null;
  model?: string | null;
  model_id?: string | null;
  request_data: Record<string, any>; // jsonb
  response_text?: string | null;
  response_data?: any; // jsonb
  response_info?: any; // jsonb
  response_errors?: any; // jsonb
  tool_updates?: any; // jsonb
  response_complete?: boolean;
  response_metadata?: Record<string, any>; // jsonb
  tokens_input?: number | null;
  tokens_output?: number | null;
  tokens_total?: number | null;
  cost?: number | null;
  time_to_first_token?: number | null;
  total_time?: number | null;
  status?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}
  
// Broker Value types
export type ScopeLevel = 
  | 'global' 
  | 'user' 
  | 'organization' 
  | 'workspace' 
  | 'project' 
  | 'task' 
  | 'ai_run' 
  | 'ai_task';

// Enum value arrays for iteration and mapping
export const DATA_TYPES = Object.values(DataType);
export const COLORS = Object.values(Color);
export const TASK_STATUSES = Object.values(TaskStatus);
export const AI_RUN_STATUSES = Object.values(AIRunStatus);
export const AI_RUN_SOURCE_TYPES = Object.values(AIRunSourceType);
export const AI_TASK_STATUSES = Object.values(AITaskStatus);
export const SCOPE_LEVELS: ScopeLevel[] = [
  'global',
  'user',
  'organization',
  'workspace',
  'project',
  'task',
  'ai_run',
  'ai_task'
];
  
  export interface BrokerValue {
    id: string;
    broker_id: string;
    is_global: boolean;
    user_id?: string | null;
    organization_id?: string | null;
    workspace_id?: string | null;
    project_id?: string | null;
    task_id?: string | null;
    ai_runs_id?: string | null;
    ai_tasks_id?: string | null;
    value: any; // JSONB - can be any valid JSON
    created_at: string;
    updated_at: string;
    created_by?: string | null;
  }
  
  // Function result types
  export interface ResolvedBrokerValue {
    broker_id: string;
    value: any;
    scope_level: ScopeLevel;
    scope_id: string | null;
  }
  
  export interface CompleteBrokerData {
    broker_id: string;
    broker_name: string;
    data_type: string;
    value: any | null;
    has_value: boolean;
    scope_level: ScopeLevel | null;
    scope_id: string | null;
    default_value: string | null;
    description: string | null;
  }
  
  // Context for broker resolution
  export interface BrokerContext {
    user_id?: string;
    organization_id?: string;
    workspace_id?: string;
    project_id?: string;
    task_id?: string;
    ai_runs_id?: string;
    ai_tasks_id?: string;
  }
  
// Input types for creating/updating
export interface CreateBrokerInput {
  name: string;
  data_type?: DataType;
  default_value?: string | null;
  color?: Color | null;
  output_component?: string | null;
  field_component_id?: string | null;
  user_id?: string | null;
  is_public?: boolean;
  authenticated_read?: boolean;
  public_read?: boolean;
  default_scope?: string | null;
  description?: string | null;
}

export interface UpdateBrokerInput {
  name?: string;
  data_type?: DataType;
  default_value?: string | null;
  color?: Color | null;
  output_component?: string | null;
  field_component_id?: string | null;
  is_public?: boolean;
  authenticated_read?: boolean;
  public_read?: boolean;
  default_scope?: string | null;
  description?: string | null;
}
  
  export interface CreateBrokerValueInput {
    broker_id: string;
    value: any;
    is_global?: boolean;
    user_id?: string | null;
    organization_id?: string | null;
    workspace_id?: string | null;
    project_id?: string | null;
    task_id?: string | null;
    ai_runs_id?: string | null;
    ai_tasks_id?: string | null;
    created_by?: string | null;
  }
  
  export interface BulkBrokerValueInput {
    broker_id: string;
    value: any;
  }
  
  export interface CreateWorkspaceInput {
    organization_id: string;
    parent_workspace_id?: string | null;
    name: string;
    description?: string | null;
    settings?: Record<string, any>;
    created_by?: string | null;
  }
  
  export interface UpdateWorkspaceInput {
    name?: string;
    description?: string | null;
    settings?: Record<string, any>;
    parent_workspace_id?: string | null;
  }