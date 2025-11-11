// Database types for system prompts system

/**
 * Main system prompt database record
 */
export interface SystemPromptDB {
  id: string;
  system_prompt_id: string;
  name: string;
  description: string | null;
  
  // Prompt reference & versioning
  source_prompt_id: string | null;
  version: number;
  prompt_snapshot: PromptSnapshot;
  
  // Display configuration
  display_config: DisplayConfig;
  
  // Placement configuration
  placement_config: PlacementConfig;
  
  // Organization
  category: string;
  subcategory: string | null;
  tags: string[];
  sort_order: number;
  
  // Variables
  required_variables: string[];
  optional_variables: string[];
  variable_mappings: Record<string, any>;
  
  // Status
  is_active: boolean;
  is_featured: boolean;
  status: SystemPromptStatus;
  
  // Usage stats
  total_executions: number;
  unique_users_count: number;
  last_executed_at: string | null;
  
  // Publishing metadata
  published_by: string | null;
  published_at: string;
  last_updated_by: string | null;
  last_updated_at: string | null;
  update_notes: string | null;
  
  // Metadata
  metadata: Record<string, any>;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Prompt snapshot stored in system_prompts
 */
export interface PromptSnapshot {
  name: string;
  description?: string;
  messages: Array<{
    role: string;
    content: string;
    metadata?: any;
  }>;
  settings: Record<string, any>;
  variableDefaults?: Array<{
    name: string;
    defaultValue: string;
  }>;
  variables: string[];
}

/**
 * Display configuration for system prompt
 */
export interface DisplayConfig {
  icon?: string;           // Lucide icon name
  label?: string;          // Display label
  tooltip?: string;        // Optional tooltip
  color?: string;          // Optional color theme
  badgeText?: string;      // Optional badge
}

/**
 * Placement configuration defining where prompt appears
 */
export interface PlacementConfig {
  contextMenu?: ContextMenuPlacement;
  card?: CardPlacement;
  button?: ButtonPlacement;
  customPlacements?: Record<string, any>;
}

/**
 * Context menu placement configuration
 */
export interface ContextMenuPlacement {
  enabled: boolean;
  group?: string;          // Menu group (e.g., 'content', 'editing', 'analysis')
  priority?: number;       // Sort order within group
}

/**
 * Card placement configuration
 */
export interface CardPlacement {
  enabled: boolean;
  cardTitle?: string;      // Default card title
  cardDescription?: string; // Default card description
  mode?: 'one-shot' | 'chat'; // Execution mode
}

/**
 * Button placement configuration
 */
export interface ButtonPlacement {
  enabled: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * System prompt status
 */
export type SystemPromptStatus = 'draft' | 'published' | 'archived';

/**
 * Trigger type for execution tracking
 */
export type SystemPromptTriggerType = 'context-menu' | 'card' | 'button' | 'api' | 'other';

/**
 * System prompt execution record
 */
export interface SystemPromptExecutionDB {
  id: string;
  system_prompt_id: string;
  user_id: string | null;
  trigger_type: SystemPromptTriggerType;
  variables_used: Record<string, any>;
  success: boolean;
  error_message: string | null;
  execution_time_ms: number | null;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Input for creating a new system prompt
 */
export interface CreateSystemPromptInput {
  system_prompt_id: string;
  name: string;
  description?: string;
  source_prompt_id?: string;
  prompt_snapshot: PromptSnapshot;
  display_config?: DisplayConfig;
  placement_config?: PlacementConfig;
  category?: string;
  subcategory?: string;
  tags?: string[];
  sort_order?: number;
  required_variables?: string[];
  optional_variables?: string[];
  variable_mappings?: Record<string, any>;
  is_active?: boolean;
  is_featured?: boolean;
  status?: SystemPromptStatus;
  metadata?: Record<string, any>;
}

/**
 * Input for updating an existing system prompt
 */
export interface UpdateSystemPromptInput {
  name?: string;
  description?: string;
  display_config?: Partial<DisplayConfig>;
  placement_config?: Partial<PlacementConfig>;
  category?: string;
  subcategory?: string;
  tags?: string[];
  sort_order?: number;
  required_variables?: string[];
  optional_variables?: string[];
  variable_mappings?: Record<string, any>;
  is_active?: boolean;
  is_featured?: boolean;
  status?: SystemPromptStatus;
  update_notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Input for publishing an update to a system prompt
 */
export interface PublishSystemPromptUpdateInput {
  prompt_snapshot: PromptSnapshot;
  update_notes: string;
}

/**
 * Query options for fetching system prompts
 */
export interface SystemPromptQueryOptions {
  category?: string;
  status?: SystemPromptStatus;
  is_active?: boolean;
  trigger_type?: 'context-menu' | 'card' | 'button';
  tags?: string[];
  search?: string;
}

/**
 * System prompt with additional computed fields
 */
export interface SystemPromptWithStats extends SystemPromptDB {
  source_prompt_name?: string;
  published_by_email?: string;
  last_updated_by_email?: string;
}

