// Database types for system prompts system

/**
 * System prompt status
 */
export type SystemPromptStatus = 'draft' | 'published' | 'archived';

/**
 * Trigger type for execution tracking
 */
export type SystemPromptTriggerType = 'context-menu' | 'card' | 'button' | 'api' | 'other';

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
  placeholder?: boolean; // For seed placeholders that don't have actual prompts yet
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
 * Placement configuration defining where prompt appears
 */
export interface PlacementConfig {
  contextMenu?: ContextMenuPlacement;
  card?: CardPlacement;
  button?: ButtonPlacement;
  customPlacements?: Record<string, any>;
}

/**
 * Main system prompt database record (NEW SCHEMA)
 */
export interface SystemPromptDB {
  id: string;
  prompt_id: string;              // Human-readable ID (e.g., "debug-and-fix")
  label: string;                  // Display name (e.g., "Debug & Fix")
  description: string | null;
  icon_name: string;              // Icon for UI display
  
  // Prompt reference & versioning
  source_prompt_id: string | null;
  version: number;
  prompt_snapshot: PromptSnapshot;
  
  // Category relationship (FK to system_prompt_categories)
  category_id: string;            // UUID FK (placement_type is in category now!)
  
  // Organization & display
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
  tags: string[];
  
  // Publishing workflow
  status: SystemPromptStatus;
  published_by: string | null;
  published_at: string;
  
  // Change tracking
  last_updated_by: string | null;
  last_updated_at: string | null;
  update_notes: string | null;
  
  // Flexible storage
  metadata: Record<string, any>;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Populated via JOIN when needed
  category?: {
    id: string;
    category_id: string;
    placement_type: 'context-menu' | 'card' | 'button' | 'modal' | 'link' | 'action';
    parent_category_id: string | null;
    label: string;
    description: string | null;
    icon_name: string;
    color: string | null;
    sort_order: number;
    is_active: boolean;
  };
}

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
 * Input for creating a new system prompt (NEW SCHEMA)
 */
export interface CreateSystemPromptInput {
  prompt_id: string;              // Human-readable ID (e.g., "debug-and-fix")
  category_id: string;            // UUID FK to system_prompt_categories
  label: string;                  // Display name
  description?: string;
  icon_name: string;              // Lucide icon name
  prompt_snapshot: PromptSnapshot;
  source_prompt_id?: string;
  tags?: string[];
  sort_order?: number;
  is_active?: boolean;
  is_featured?: boolean;
  status?: SystemPromptStatus;
  metadata?: Record<string, any>;
}

/**
 * Input for updating an existing system prompt (NEW SCHEMA)
 */
export interface UpdateSystemPromptInput {
  prompt_id?: string;
  category_id?: string;
  label?: string;
  description?: string;
  icon_name?: string;
  tags?: string[];
  sort_order?: number;
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
 * Query options for fetching system prompts (NEW SCHEMA)
 */
export interface SystemPromptQueryOptions {
  placement_type?: 'context-menu' | 'card' | 'button' | 'modal' | 'link' | 'action';
  category_id?: string;           // UUID FK to system_prompt_categories
  status?: SystemPromptStatus;
  is_active?: boolean;
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
