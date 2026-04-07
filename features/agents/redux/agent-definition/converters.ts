/**
 * Agent Definition — DB ↔ Frontend Converters
 *
 * Rules:
 *  - Outer column names convert between snake_case (DB) and camelCase (frontend).
 *  - The CONTENTS of all JSONB fields (messages, settings, variable_definitions,
 *    context_slots, model_tiers, output_schema, custom_tools) are NEVER case-converted.
 *    They are stored and returned exactly as the DB/API provides them.
 *
 * DB-managed fields — excluded from ALL write payloads (Insert + Update):
 *  - id                 — DB generates on insert
 *  - created_at         — DB trigger
 *  - updated_at         — DB trigger (set_agx_agent_updated_at)
 *  - source_agent_id    — set only by agx_duplicate_agent() RPC, never by direct writes
 *  - source_snapshot_at — set only by agx_duplicate_agent() RPC, never by direct writes
 *
 * Version-specific frontend fields (isVersion, parentAgentId, versionNumber,
 * changedAt, changeNote) are frontend-only runtime fields — never written to DB.
 * Live agent records from dbRowToAgentDefinition() always set these to their
 * false/null defaults.
 */

import type { Database } from "@/types/database.types";
import type {
  AgentDefinition,
  AgentType,
  AgentVersionSnapshot,
} from "../../types/agent-definition.types";

export type { AgentVersionSnapshot };

// ---------------------------------------------------------------------------
// Supabase row types (derived from generated types)
// ---------------------------------------------------------------------------

type AgentRow = Database["public"]["Tables"]["agx_agent"]["Row"];
type AgentInsert = Omit<
  Database["public"]["Tables"]["agx_agent"]["Insert"],
  "id" | "created_at" | "updated_at" | "source_agent_id" | "source_snapshot_at"
>;
type AgentUpdate = Omit<
  Database["public"]["Tables"]["agx_agent"]["Update"],
  "id" | "created_at" | "updated_at" | "source_agent_id" | "source_snapshot_at"
>;

export type { AgentInsert, AgentUpdate };

// ---------------------------------------------------------------------------
// DB → Frontend
// ---------------------------------------------------------------------------

/**
 * Converts a full agents Row into the frontend AgentDefinition shape.
 * Safe to call with any row — all JSONB fields are cast but not key-converted.
 */
export function dbRowToAgentDefinition(row: AgentRow): AgentDefinition {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    tags: row.tags ?? [],
    isActive: row.is_active,
    isPublic: row.is_public,
    isArchived: row.is_archived,
    isFavorite: row.is_favorite,
    agentType: row.agent_type as AgentType,

    modelId: row.model_id,
    // messages: JSONB — cast but not key-converted
    messages: (row.messages as unknown as AgentDefinition["messages"]) ?? [],
    variableDefinitions:
      (row.variable_definitions as unknown as AgentDefinition["variableDefinitions"]) ??
      null,
    settings:
      (row.settings as unknown as AgentDefinition["settings"]) ??
      ({} as AgentDefinition["settings"]),
    tools: row.tools ?? [],

    contextSlots:
      (row.context_slots as unknown as AgentDefinition["contextSlots"]) ?? [],

    modelTiers:
      (row.model_tiers as unknown as AgentDefinition["modelTiers"]) ?? null,
    outputSchema:
      (row.output_schema as unknown as AgentDefinition["outputSchema"]) ?? null,
    customTools:
      (row.custom_tools as unknown as AgentDefinition["customTools"]) ?? [],
    mcpServers: row.mcp_servers ?? [],

    userId: row.user_id,
    organizationId: row.organization_id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    taskId: row.task_id,

    sourceAgentId: row.source_agent_id,
    sourceSnapshotAt: row.source_snapshot_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    // Live agents from the DB are never version snapshots
    isVersion: false,
    parentAgentId: null,
    versionNumber: null,
    changedAt: null,
    changeNote: null,

    // Access metadata not available from a direct row fetch —
    // populated separately by fetchAgentsList or fetchAgentAccessLevel
    isOwner: null,
    accessLevel: null,
    sharedByEmail: null,
  };
}

// ---------------------------------------------------------------------------
// Frontend → DB (Insert — new record, no id)
// ---------------------------------------------------------------------------

/**
 * Converts an AgentDefinition into a DB Insert payload.
 * Strips all DB-managed fields (id, created_at, updated_at, version).
 */
export function agentDefinitionToInsert(agent: AgentDefinition): AgentInsert {
  return {
    name: agent.name,
    description: agent.description,
    category: agent.category,
    tags: agent.tags,
    is_active: agent.isActive,
    is_public: agent.isPublic,
    is_archived: agent.isArchived,
    is_favorite: agent.isFavorite,
    agent_type: agent.agentType,

    model_id: agent.modelId,
    messages:
      agent.messages as unknown as Database["public"]["Tables"]["agx_agent"]["Insert"]["messages"],
    variable_definitions:
      agent.variableDefinitions as unknown as Database["public"]["Tables"]["agx_agent"]["Insert"]["variable_definitions"],
    settings:
      agent.settings as unknown as Database["public"]["Tables"]["agx_agent"]["Insert"]["settings"],
    tools: agent.tools,

    context_slots:
      agent.contextSlots as unknown as Database["public"]["Tables"]["agx_agent"]["Insert"]["context_slots"],

    model_tiers:
      agent.modelTiers as unknown as Database["public"]["Tables"]["agx_agent"]["Insert"]["model_tiers"],
    output_schema:
      agent.outputSchema as unknown as Database["public"]["Tables"]["agx_agent"]["Insert"]["output_schema"],
    custom_tools:
      agent.customTools as unknown as Database["public"]["Tables"]["agx_agent"]["Insert"]["custom_tools"],
    mcp_servers: agent.mcpServers,

    user_id: agent.userId,
    organization_id: agent.organizationId,
    workspace_id: agent.workspaceId,
    project_id: agent.projectId,
    task_id: agent.taskId,
  };
}

// ---------------------------------------------------------------------------
// Frontend → DB (Update — partial, keyed by id externally)
// ---------------------------------------------------------------------------

/**
 * Converts a partial AgentDefinition into a DB Update payload.
 * Only includes keys present in the input — never overwrites with undefined.
 * Strips all DB-managed fields even if accidentally included.
 */
export function agentDefinitionToUpdate(
  partial: Partial<AgentDefinition>,
): AgentUpdate {
  const update: AgentUpdate = {};

  if (partial.name !== undefined) update.name = partial.name;
  if (partial.description !== undefined)
    update.description = partial.description;
  if (partial.category !== undefined) update.category = partial.category;
  if (partial.tags !== undefined) update.tags = partial.tags;
  if (partial.isActive !== undefined) update.is_active = partial.isActive;
  if (partial.isPublic !== undefined) update.is_public = partial.isPublic;
  if (partial.isArchived !== undefined) update.is_archived = partial.isArchived;
  if (partial.isFavorite !== undefined) update.is_favorite = partial.isFavorite;
  if (partial.agentType !== undefined) update.agent_type = partial.agentType;

  if (partial.modelId !== undefined) update.model_id = partial.modelId;
  if (partial.messages !== undefined)
    update.messages =
      partial.messages as unknown as Database["public"]["Tables"]["agx_agent"]["Update"]["messages"];
  if (partial.variableDefinitions !== undefined)
    update.variable_definitions =
      partial.variableDefinitions as unknown as Database["public"]["Tables"]["agx_agent"]["Update"]["variable_definitions"];
  if (partial.settings !== undefined)
    update.settings =
      partial.settings as unknown as Database["public"]["Tables"]["agx_agent"]["Update"]["settings"];
  if (partial.tools !== undefined) update.tools = partial.tools;

  if (partial.contextSlots !== undefined)
    update.context_slots =
      partial.contextSlots as unknown as Database["public"]["Tables"]["agx_agent"]["Update"]["context_slots"];

  if (partial.modelTiers !== undefined)
    update.model_tiers =
      partial.modelTiers as unknown as Database["public"]["Tables"]["agx_agent"]["Update"]["model_tiers"];
  if (partial.outputSchema !== undefined)
    update.output_schema =
      partial.outputSchema as unknown as Database["public"]["Tables"]["agx_agent"]["Update"]["output_schema"];
  if (partial.customTools !== undefined)
    update.custom_tools =
      partial.customTools as unknown as Database["public"]["Tables"]["agx_agent"]["Update"]["custom_tools"];
  if (partial.mcpServers !== undefined) update.mcp_servers = partial.mcpServers;

  if (partial.userId !== undefined) update.user_id = partial.userId;
  if (partial.organizationId !== undefined)
    update.organization_id = partial.organizationId;
  if (partial.workspaceId !== undefined)
    update.workspace_id = partial.workspaceId;
  if (partial.projectId !== undefined) update.project_id = partial.projectId;
  if (partial.taskId !== undefined) update.task_id = partial.taskId;

  return update;
}

// ---------------------------------------------------------------------------
// Version Snapshot → Frontend
// ---------------------------------------------------------------------------

/**
 * Converts a version snapshot RPC row into AgentDefinition shape.
 * Used by both the client thunk (fetchAgentVersionSnapshot) and
 * SSR data layer (getAgentSnapshot) — single source of truth.
 */
export function versionSnapshotRowToAgentDefinition(
  parentAgentId: string,
  row: AgentVersionSnapshot,
): AgentDefinition {
  return {
    id: row.version_id,
    isVersion: true,
    parentAgentId,
    versionNumber: row.version_number,
    changedAt: row.changed_at,
    changeNote: row.change_note,

    agentType: row.agent_type as AgentDefinition["agentType"],
    name: row.name,
    description: row.description,
    category: row.category,
    tags: row.tags,
    isActive: row.is_active,

    isPublic: false,
    isArchived: false,
    isFavorite: false,
    userId: null,
    organizationId: null,
    workspaceId: null,
    projectId: null,
    taskId: null,
    sourceAgentId: null,
    sourceSnapshotAt: null,
    createdAt: row.changed_at,
    updatedAt: row.changed_at,

    modelId: row.model_id,
    messages: row.messages ?? [],
    variableDefinitions: row.variable_definitions,
    settings: row.settings,
    tools: row.tools ?? [],
    contextSlots: row.context_slots ?? [],
    modelTiers: row.model_tiers,
    outputSchema: row.output_schema,
    customTools: row.custom_tools ?? [],
    mcpServers: [],

    isOwner: null,
    accessLevel: null,
    sharedByEmail: null,
  };
}
