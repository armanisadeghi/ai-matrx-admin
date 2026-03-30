import {
  ContextSlot,
  CustomToolDefinition,
  LLMParams,
} from "@/features/agents/types/agent-api-types";
import { AgentDefinitionMessage } from "@/features/agents/types/agent-message-types";
import { OutputSchema } from "@/features/agents/types/json-schema";

export type AgentType = "user" | "builtin";

export interface VariableDefinition {
  name: string;
  defaultValue: unknown;
  helpText?: string;
  required?: boolean;
  customComponent?: string;
}

export interface ModelTier {
  modelId: string;
  label?: string;
}

export interface ModelTiers {
  default: string;
  flexible?: boolean;
  tiers?: Record<string, ModelTier>;
}

export interface AgentDefinition {
  // Identity / filtering / sorting
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  isActive: boolean;
  isPublic: boolean;
  isArchived: boolean;
  isFavorite: boolean;

  // Type (Created by users vs. built for the system)
  agentType: AgentType;

  // Core Configurations (Define all agent behavior)
  modelId: string | null;
  messages: AgentDefinitionMessage[];
  variableDefinitions: VariableDefinition[] | null;
  settings: LLMParams;
  tools: string[]; // uuid array (ToolRegistry)

  // IMPORTANT: Pre-defined context slots for the agent
  contextSlots: ContextSlot[];

  // Extras
  modelTiers: ModelTiers | null;
  outputSchema: OutputSchema | null;
  customTools: CustomToolDefinition[];

  // Ownership & Hierarchy
  userId: string | null;
  organizationId: string | null;
  workspaceId: string | null;
  projectId: string | null;
  taskId: string | null;

  // Lineage
  sourceAgentId: string | null;
  sourceSnapshotAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// RPC return types
// ---------------------------------------------------------------------------

/**
 * Returned by `get_agents_list()`.
 *
 * Lightweight rows for the agents list/page view. RLS filters automatically.
 * Ordered by updated_at DESC. All further filtering is client-side.
 */
export interface AgentListRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  agent_type: AgentType;
  model_id: string | null;
  is_active: boolean;
  is_public: boolean;
  is_archived: boolean;
  is_favorite: boolean;
  source_agent_id: string | null;
  user_id: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for `duplicate_agent(agent_id)`.
 * Returns the new agent's UUID.
 */
export interface DuplicateAgentParams {
  agent_id: string;
}

export type DuplicateAgentResult = string; // new agent UUID

/**
 * Returned by `get_agent_execution_minimal(agent_id)`.
 *
 * For pages that don't allow pre-execution configuration overrides.
 * Three fields only.
 */
export interface AgentExecutionMinimal {
  id: string;
  variable_definitions: VariableDefinition[] | null;
  context_slots: ContextSlot[];
}

/**
 * Returned by `get_agent_execution_full(agent_id)`.
 *
 * For pages where the user can customise settings before running.
 * Messages are excluded — fetched separately at execution time.
 */
export interface AgentExecutionFull {
  id: string;
  variable_definitions: VariableDefinition[] | null;
  model_id: string | null;
  settings: LLMParams;
  tools: string[]; // uuid[] → ToolRegistry
  custom_tools: CustomToolDefinition[];
  context_slots: ContextSlot[];
}

// ---------------------------------------------------------------------------
// Runtime records & slice state
// ---------------------------------------------------------------------------

export interface AgentDefinitionRecord extends AgentDefinition {
  _dirty: boolean;
  _dirtyFields?: Set<string>;
  _loading: boolean;
  _error: string | null;
}

export interface AgentDefinitionSliceState {
  agents: Record<string, AgentDefinitionRecord>;
  activeAgentId: string | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}
