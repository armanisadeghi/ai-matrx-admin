/**
 * RPC row parsers for agent-definition thunks.
 *
 * Each parser validates the first-level shape of an RPC row at runtime.
 * Primitive fields (string, number, boolean, string[]) are checked for
 * presence and type. `Json` fields are accepted as-is and typed `unknown` —
 * the caller is responsible for narrowing them further if needed.
 *
 * Throws a descriptive error if any required first-level field is missing
 * or has the wrong primitive type. This surfaces data contract bugs early
 * rather than letting them silently corrupt Redux state.
 */

import type {
  AgentExecutionMinimal,
  AgentExecutionFull,
  AgentDriftItem,
  AgentReference,
  PromoteVersionResult,
  AcceptVersionResult,
  UpdateFromSourceResult,
} from "./types";
import type {
  AgentVersionHistoryItem,
  AgentVersionSnapshot,
  AgentAccessLevel,
} from "./thunks";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type Primitive = "string" | "number" | "boolean";

function assertField(
  row: Record<string, unknown>,
  key: string,
  type: Primitive,
  rpc: string,
): void {
  if (!(key in row)) {
    throw new Error(`[${rpc}] Missing required field: "${key}"`);
  }
  if (typeof row[key] !== type) {
    throw new Error(
      `[${rpc}] Field "${key}" expected ${type}, got ${typeof row[key]}`,
    );
  }
}

function assertOptionalField(
  row: Record<string, unknown>,
  key: string,
  type: Primitive,
  rpc: string,
): void {
  if (key in row && row[key] !== null && typeof row[key] !== type) {
    throw new Error(
      `[${rpc}] Optional field "${key}" expected ${type} or null, got ${typeof row[key]}`,
    );
  }
}

function assertStringArray(
  row: Record<string, unknown>,
  key: string,
  rpc: string,
): void {
  const val = row[key];
  if (!Array.isArray(val) || val.some((v) => typeof v !== "string")) {
    throw new Error(
      `[${rpc}] Field "${key}" expected string[], got ${JSON.stringify(val)}`,
    );
  }
}

function toRow(raw: unknown, rpc: string): Record<string, unknown> {
  if (raw === null || raw === undefined) {
    throw new Error(`[${rpc}] Row is null or undefined`);
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`[${rpc}] Row is not an object`);
  }
  return raw as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Exported parsers — one per RPC return shape
// ---------------------------------------------------------------------------

export function parseExecutionMinimal(raw: unknown): AgentExecutionMinimal {
  const rpc = "get_agent_execution_minimal";
  const row = toRow(raw, rpc);
  assertField(row, "id", "string", rpc);
  // variable_definitions and context_slots are Json — accepted as unknown
  return {
    id: row.id as string,
    variable_definitions: (row.variable_definitions ??
      null) as AgentExecutionMinimal["variable_definitions"],
    context_slots: (row.context_slots ??
      null) as AgentExecutionMinimal["context_slots"],
  };
}

export function parseExecutionFull(raw: unknown): AgentExecutionFull {
  const rpc = "get_agent_execution_full";
  const row = toRow(raw, rpc);
  assertField(row, "id", "string", rpc);
  assertOptionalField(row, "model_id", "string", rpc);
  if ("tools" in row) assertStringArray(row, "tools", rpc);
  return {
    id: row.id as string,
    variable_definitions: (row.variable_definitions ??
      null) as AgentExecutionFull["variable_definitions"],
    model_id: (row.model_id ?? null) as string | null,
    settings: row.settings as AgentExecutionFull["settings"],
    tools: (row.tools ?? []) as string[],
    custom_tools: (row.custom_tools ??
      []) as AgentExecutionFull["custom_tools"],
    context_slots: (row.context_slots ??
      null) as AgentExecutionFull["context_slots"],
  };
}

export function parseVersionHistoryItem(raw: unknown): AgentVersionHistoryItem {
  const rpc = "get_agent_version_history";
  const row = toRow(raw, rpc);
  assertField(row, "version_id", "string", rpc);
  assertField(row, "version_number", "number", rpc);
  assertField(row, "name", "string", rpc);
  assertField(row, "changed_at", "string", rpc);
  return {
    version_id: row.version_id as string,
    version_number: row.version_number as number,
    name: row.name as string,
    changed_at: row.changed_at as string,
    change_note: (row.change_note ?? null) as string | null,
  };
}

export function parseVersionSnapshot(raw: unknown): AgentVersionSnapshot {
  const rpc = "get_agent_version_snapshot";
  const row = toRow(raw, rpc);
  assertField(row, "version_id", "string", rpc);
  assertField(row, "version_number", "number", rpc);
  assertField(row, "name", "string", rpc);
  assertField(row, "changed_at", "string", rpc);
  assertField(row, "is_active", "boolean", rpc);
  if ("tags" in row) assertStringArray(row, "tags", rpc);
  if ("tools" in row) assertStringArray(row, "tools", rpc);
  return {
    version_id: row.version_id as string,
    version_number: row.version_number as number,
    agent_type: (row.agent_type ?? "") as string,
    name: row.name as string,
    description: (row.description ?? null) as string | null,
    messages: row.messages as AgentVersionSnapshot["messages"],
    variable_definitions:
      row.variable_definitions as AgentVersionSnapshot["variable_definitions"],
    model_id: (row.model_id ?? null) as string | null,
    model_tiers: row.model_tiers as AgentVersionSnapshot["model_tiers"],
    settings: row.settings as AgentVersionSnapshot["settings"],
    output_schema: row.output_schema as AgentVersionSnapshot["output_schema"],
    tools: (row.tools ?? []) as string[],
    custom_tools: row.custom_tools as AgentVersionSnapshot["custom_tools"],
    context_slots: row.context_slots as AgentVersionSnapshot["context_slots"],
    category: (row.category ?? null) as string | null,
    tags: (row.tags ?? []) as string[],
    is_active: row.is_active as boolean,
    changed_at: row.changed_at as string,
    change_note: (row.change_note ?? null) as string | null,
  };
}

export function parseAccessLevel(raw: unknown): AgentAccessLevel {
  const rpc = "get_agent_access_level";
  const row = toRow(raw, rpc);
  assertField(row, "agent_id", "string", rpc);
  assertField(row, "agent_name", "string", rpc);
  assertField(row, "access_level", "string", rpc);
  assertField(row, "is_owner", "boolean", rpc);
  return {
    agent_id: row.agent_id as string,
    agent_name: row.agent_name as string,
    owner_id: (row.owner_id ?? null) as string | null,
    owner_email: (row.owner_email ?? null) as string | null,
    access_level: row.access_level as AgentAccessLevel["access_level"],
    is_owner: row.is_owner as boolean,
  };
}

export function parseDriftItem(raw: unknown): AgentDriftItem {
  const rpc = "check_agent_drift";
  const row = toRow(raw, rpc);
  assertField(row, "reference_id", "string", rpc);
  assertField(row, "agent_id", "string", rpc);
  assertField(row, "agent_name", "string", rpc);
  assertField(row, "version_pinned_to", "number", rpc);
  assertField(row, "current_version", "number", rpc);
  assertField(row, "versions_behind", "number", rpc);
  return row as unknown as AgentDriftItem;
}

export function parseAgentReference(raw: unknown): AgentReference {
  const rpc = "check_agent_references";
  const row = toRow(raw, rpc);
  assertField(row, "reference_id", "string", rpc);
  assertField(row, "reference_name", "string", rpc);
  assertField(row, "reference_type", "string", rpc);
  assertField(row, "use_latest", "boolean", rpc);
  assertField(row, "is_behind", "boolean", rpc);
  return row as unknown as AgentReference;
}

export function parsePromoteVersionResult(raw: unknown): PromoteVersionResult {
  const rpc = "promote_agent_version";
  const row = toRow(raw, rpc);
  assertField(row, "success", "boolean", rpc);
  return {
    success: row.success as boolean,
    error: (row.error ?? undefined) as string | undefined,
    promoted_version: (row.promoted_version ?? undefined) as number | undefined,
    agent_id: (row.agent_id ?? undefined) as string | undefined,
  };
}

export function parseAcceptVersionResult(raw: unknown): AcceptVersionResult {
  const rpc = "accept_agent_version";
  const row = toRow(raw, rpc);
  assertField(row, "success", "boolean", rpc);
  return {
    success: row.success as boolean,
    error: (row.error ?? undefined) as string | undefined,
    reference_type: (row.reference_type ?? undefined) as string | undefined,
    reference_id: (row.reference_id ?? undefined) as string | undefined,
    accepted_version: (row.accepted_version ?? undefined) as number | undefined,
  };
}

export function parseUpdateFromSourceResult(
  raw: unknown,
): UpdateFromSourceResult {
  const rpc = "update_agent_from_source";
  const row = toRow(raw, rpc);
  assertField(row, "success", "boolean", rpc);
  return {
    success: row.success as boolean,
    error: (row.error ?? undefined) as string | undefined,
    source_version: (row.source_version ?? undefined) as number | undefined,
    agent_name: (row.agent_name ?? undefined) as string | undefined,
  };
}

export function parsePurgeVersionsResult(
  raw: unknown,
): import("./thunks").PurgeVersionsResult {
  const rpc = "purge_agent_versions";
  const row = toRow(raw, rpc);
  assertField(row, "success", "boolean", rpc);
  return {
    success: row.success as boolean,
    error: (row.error ?? undefined) as string | undefined,
    deleted_count: (row.deleted_count ?? undefined) as number | undefined,
    kept_count: (row.kept_count ?? undefined) as number | undefined,
  };
}
