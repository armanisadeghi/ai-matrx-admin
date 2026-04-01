import {
  ContextSlot,
  CustomToolDefinition,
  LLMParams,
} from "@/features/agents/types/agent-api-types";
import { AgentDefinitionMessage } from "@/features/agents/types/agent-message-types";
import { OutputSchema } from "@/features/agents/types/json-schema";

export type AgentType = "user" | "builtin";

// ---------------------------------------------------------------------------
// Variable component types
// ---------------------------------------------------------------------------

/** The input UI type for a variable's custom component. */
export type VariableComponentType =
  | "textarea" // Default — multi-line text
  | "toggle" // Boolean with custom on/off labels
  | "radio" // Single-select from options
  | "checkbox" // Multi-select from options
  | "select" // Dropdown single-select
  | "number"; // Number input with optional min/max/step

/** Configuration for a variable's custom UI input component. */
export interface VariableCustomComponent {
  type: VariableComponentType;
  options?: string[];
  allowOther?: boolean;
  toggleValues?: [string, string];
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Permission level for the current user on any given agent.
 * 'system'  — builtin agent; not owned or shared, read-only for everyone
 * 'public'  — agent is public, no specific share grant
 * 'none'    — no access (returned by get_agent_access_level when the user
 *             somehow calls it on an agent they can't see)
 */
export type AccessLevel =
  | "owner"
  | "admin"
  | "editor"
  | "viewer"
  | "system"
  | "public"
  | "none";

export interface VariableDefinition {
  name: string;
  defaultValue: unknown;
  helpText?: string;
  required?: boolean;
  /** Custom UI input component for collecting this variable's value. */
  customComponent?: VariableCustomComponent;
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

// ---------------------------------------------------------------------------
// AgentDefinition — single unified type for both live agents and version snapshots.
//
// Live agents (agents table):
//   isVersion = false, parentAgentId = null, versionNumber = current live version
//
// Version snapshots (agent_versions table):
//   isVersion = true, parentAgentId = agents.id, versionNumber = the snapshot number
//   id = agent_versions.id (used as resolved_id for execution)
//   Some fields that only exist on live agents will be null on version records:
//   isPublic, isArchived, isFavorite, userId, organizationId, workspaceId,
//   projectId, taskId, sourceAgentId, sourceSnapshotAt, createdAt, updatedAt
//
// The UI treats them identically everywhere EXCEPT version-specific UI
// (version history panel, drift indicators) which uses isVersion + parentAgentId.
// ---------------------------------------------------------------------------

export interface AgentDefinition {
  // Identity
  id: string; // agents.id for live agents; agent_versions.id for snapshots
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  agentType: AgentType;

  // Version identity — null on live agents, set on snapshots
  isVersion: boolean; // true = this record is from agent_versions
  parentAgentId: string | null; // FK → agents.id, only set when isVersion = true
  versionNumber: number | null; // the snapshot's version_number (or live agents.version)
  changedAt: string | null; // agent_versions.changed_at, null for live agents
  changeNote: string | null; // agent_versions.change_note, null for live agents

  // Live-agent-only flags (null on version records)
  isActive: boolean;
  isPublic: boolean;
  isArchived: boolean;
  isFavorite: boolean;

  // Core configuration
  modelId: string | null;
  messages: AgentDefinitionMessage[];
  variableDefinitions: VariableDefinition[] | null;
  settings: LLMParams;
  tools: string[]; // uuid[] → ToolRegistry
  contextSlots: ContextSlot[];
  modelTiers: ModelTiers | null;
  outputSchema: OutputSchema | null;
  customTools: CustomToolDefinition[];

  // Ownership & Hierarchy (null on version records)
  userId: string | null;
  organizationId: string | null;
  workspaceId: string | null;
  projectId: string | null;
  taskId: string | null;

  // Lineage (read-only — managed by DB triggers / duplicate_agent RPC)
  // null on version records
  sourceAgentId: string | null;
  sourceSnapshotAt: string | null;
  createdAt: string;
  updatedAt: string;

  // Access metadata — current user's relationship to this record.
  // Populated by get_agents_list() and get_agent_access_level().
  // null when not yet fetched (e.g. record arrived via a shortcut RPC).
  isOwner: boolean | null;
  accessLevel: AccessLevel | null;
  sharedByEmail: string | null; // null when isOwner = true or not yet loaded
}

// ---------------------------------------------------------------------------
// RPC return types
// ---------------------------------------------------------------------------

/**
 * Returned by `get_agents_list()`.
 * Returns the current user's own agents PLUS everything shared with them
 * (direct user shares and org-level shares), deduplicated.
 * Does NOT include system/builtin agents.
 * SECURITY DEFINER — explicit access metadata per row.
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
  is_archived: boolean;
  is_favorite: boolean;
  user_id: string | null;
  organization_id: string | null;
  workspace_id: string | null;
  project_id: string | null;
  task_id: string | null;
  source_agent_id: string | null;
  created_at: string;
  updated_at: string;
  // Access metadata
  is_owner: boolean;
  access_level: AccessLevel;
  shared_by_email: string | null;
}

/** Input for `duplicate_agent(agent_id)`. Returns the new agent's UUID. */
export interface DuplicateAgentParams {
  agent_id: string;
}
export type DuplicateAgentResult = string; // new agent UUID

/** Input for `promote_agent_version(agent_id, version_number)`. */
export interface PromoteVersionParams {
  agent_id: string;
  version_number: number;
}
export interface PromoteVersionResult {
  success: boolean;
  error?: string;
  promoted_version?: number;
  agent_id?: string;
}

/** Returned by `get_agent_execution_minimal(agent_id)`. */
export interface AgentExecutionMinimal {
  id: string;
  variable_definitions: VariableDefinition[] | null;
  context_slots: ContextSlot[] | null;
}

/** Returned by `get_agent_execution_full(agent_id)`. */
export interface AgentExecutionFull {
  id: string;
  variable_definitions: VariableDefinition[] | null;
  model_id: string | null;
  settings: LLMParams;
  tools: string[];
  custom_tools: CustomToolDefinition[];
  context_slots: ContextSlot[] | null;
}

/** Returned by `check_agent_drift(agent_id?)`. */
export interface AgentDriftItem {
  reference_type: "shortcut" | "app" | "derived_agent";
  reference_id: string;
  reference_name: string;
  agent_id: string;
  agent_name: string;
  version_pinned_to: number;
  current_version: number;
  versions_behind: number;
}

/** Returned by `check_agent_references(agent_id)`. */
export interface AgentReference {
  reference_type: "shortcut" | "app" | "derived_agent";
  reference_id: string;
  reference_name: string;
  use_latest: boolean;
  is_behind: boolean;
}

/** Returned by `accept_agent_version(type, ref_id)`. */
export interface AcceptVersionResult {
  success: boolean;
  error?: string;
  reference_type?: string;
  reference_id?: string;
  accepted_version?: number;
}

/** Returned by `update_agent_from_source(agent_id)`. */
export interface UpdateFromSourceResult {
  success: boolean;
  error?: string;
  source_version?: number;
  agent_name?: string;
}

// ---------------------------------------------------------------------------
// Runtime records & slice state
// ---------------------------------------------------------------------------

/**
 * Tracks which data has been fetched for a given agent record.
 *
 * Precedence (highest wins — never downgrade):
 *   versionSnapshot > full > customExecution / execution > list > null
 *
 *   null             — record exists in state but no fetch has completed yet
 *   "list"           — display fields only (name, tags, category, access metadata, …)
 *   "execution"      — minimal execution fields: variableDefinitions + contextSlots
 *   "customExecution"— execution + settings, tools, customTools, modelId (pre-run overrides)
 *   "full"           — complete agents table row; marks record clean
 *   "versionSnapshot"— full content from agent_versions; marks record clean
 *
 * "execution" and "customExecution" are parallel tracks that do NOT override each other —
 * a record may have both if fetchAgentExecutionMinimal ran before fetchAgentExecutionFull.
 * In that case the status will be "customExecution" (the higher one).
 *
 * "shared" and "accessLevel" fetches patch access metadata only and do NOT change this field.
 */
export type AgentFetchStatus =
  | "list"
  | "execution"
  | "customExecution"
  | "full"
  | "versionSnapshot";

/**
 * Rank table for precedence checks. Higher number = higher precedence.
 * versionSnapshot is the ceiling — nothing may overwrite it.
 */
export const FETCH_STATUS_RANK: Record<AgentFetchStatus, number> = {
  list: 1,
  execution: 2,
  customExecution: 3,
  full: 4,
  versionSnapshot: 5,
};

/**
 * Returns true when the incoming status should overwrite the current one.
 * "execution" and "customExecution" are deliberately NOT compared against each other
 * on the same axis — if both are needed the slice applies them independently and
 * the higher rank wins.
 */
export function shouldUpgradeFetchStatus(
  current: AgentFetchStatus | null,
  incoming: AgentFetchStatus,
): boolean {
  if (current === null) return true;
  return FETCH_STATUS_RANK[incoming] > FETCH_STATUS_RANK[current];
}

/**
 * Snapshot of field values before user edits.
 * Anchored to the last clean fetch. Enables per-field undo.
 */
export type FieldSnapshot = {
  [K in keyof AgentDefinition]?: AgentDefinition[K];
};

/**
 * Tracks which fields have been explicitly fetched from the DB for this record.
 *   key in set  → field was fetched (null/empty IS the DB value)
 *   key not in set → field has not been fetched yet
 */
export type LoadedFields = Set<keyof AgentDefinition>;

export interface AgentDefinitionRecord extends AgentDefinition {
  _dirty: boolean;
  _dirtyFields: Set<keyof AgentDefinition>;
  _fieldHistory: FieldSnapshot;
  _loadedFields: LoadedFields;
  _fetchStatus: AgentFetchStatus | null;
  _loading: boolean;
  _error: string | null;
}

export interface AgentDefinitionSliceState {
  // Single registry — keyed by id.
  // Live agents use agents.id. Version snapshots use agent_versions.id.
  // Distinguish with record.isVersion.
  agents: Record<string, AgentDefinitionRecord>;

  // ID of the agent currently open in the builder / editor
  activeAgentId: string | null;

  // Global slice status (e.g. initial list fetch)
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}
