import { ContextSlot } from "@/features/agents/types/agent-api-types";
import { VariableDefinition } from "@/features/agents/types/agent-definition.types";
import { ResultDisplay } from "@/features/agents/utils/run-ui-utils";
import { ShortcutContext } from "@/features/agents/utils/shortcut-context-utils";
import type { DbRpcRow } from "@/types/supabase-rpc";
import type { FieldFlags } from "@/features/agents/redux/shared/field-flags";

export type { ResultDisplay, ShortcutContext };

// ---------------------------------------------------------------------------
// Domain type — mirrors the agx_shortcut table (26 columns)
// ---------------------------------------------------------------------------

export interface AgentShortcut {
  // Identity
  id: string;
  categoryId: string;
  label: string;
  description: string | null;
  iconName: string | null;
  keyboardShortcut: string | null;
  sortOrder: number;

  // Universal version reference pattern
  agentId: string | null; // FK → agents (stable identity / display)
  agentVersionId: string | null; // FK → agx_version (pinned snapshot)
  useLatest: boolean; // true = always resolve to live agent

  // Context & scope
  enabledContexts: ShortcutContext[];
  scopeMappings: Record<string, string> | null;
  // keys   = scope keys the UI provides (e.g. "selection", "active_doc")
  // values = variable/context_slot names on the agent

  // Execution behaviour
  resultDisplay: ResultDisplay;
  allowChat: boolean;
  autoRun: boolean;
  applyVariables: boolean;
  showVariables: boolean;
  usePreExecutionInput: boolean;

  // Status
  isActive: boolean;

  // Hierarchy (each column independently set — no auto-fill)
  userId: string | null; // null = system shortcut
  organizationId: string | null;
  projectId: string | null;
  taskId: string | null;

  // Timestamps (read-only — DB managed)
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// RPC return types
// ---------------------------------------------------------------------------

/**
 * Returned by `agx_get_shortcuts_initial()` and `agx_get_shortcuts_for_context()`.
 *
 * The RPC resolves the version reference and returns:
 *   resolved_id  — ONE uuid to pass to the backend for execution
 *   is_version   — false = resolved_id is an agx_agent.id, true = agx_version.id
 *   is_behind    — true = a newer version of the agent exists (drift indicator)
 *
 * Resolution logic (handled inside the RPC):
 *   use_latest = true OR version is current → resolved_id = agent_id, is_version = false
 *   version is behind                       → resolved_id = agent_version_id, is_version = true
 */
export interface AgentShortcutInitialRow {
  // Shortcut identity
  shortcut_id: string;
  category_id: string;
  label: string;
  description: string | null;
  icon_name: string | null;
  keyboard_shortcut: string | null;
  sort_order: number;

  // Resolved version reference
  resolved_id: string | null; // single uuid for execution
  is_version: boolean; // false = agx_agent row, true = agx_version row
  is_behind: boolean; // true = newer version exists

  // Raw reference data (for drift UI and editing the shortcut itself)
  agent_id: string | null;
  agent_version_id: string | null;
  current_version: number | null;
  use_latest: boolean;

  // Shortcut config
  enabled_contexts: ShortcutContext[];
  scope_mappings: Record<string, string> | null;
  result_display: ResultDisplay;
  allow_chat: boolean;
  auto_run: boolean;
  apply_variables: boolean;
  show_variables: boolean;
  use_pre_execution_input: boolean;

  // Ownership
  shortcut_user_id: string | null; // null = system shortcut
  shortcut_org_id: string | null; // null = not org-scoped

  // Agent data from the RESOLVED version (ready for execution — no second fetch needed)
  agent_name: string | null;
  agent_variable_definitions: VariableDefinition[] | null;
  agent_context_slots: ContextSlot[] | null;
}
type _CheckAgentShortcutInitialRow =
  AgentShortcutInitialRow extends DbRpcRow<"agx_get_shortcuts_initial">
    ? true
    : false;
declare const _agentShortcutInitialRow: _CheckAgentShortcutInitialRow;
true satisfies typeof _agentShortcutInitialRow;

/**
 * Returned by `agx_get_shortcuts_for_context(project_id?, task_id?)`.
 * Extends initial with hierarchy ids. Overlapping shortcut ids overwrite phase-1 data.
 */
export interface AgentShortcutContextRow extends AgentShortcutInitialRow {
  shortcut_project_id: string | null;
  shortcut_task_id: string | null;
}
type _CheckAgentShortcutContextRow =
  AgentShortcutContextRow extends DbRpcRow<"agx_get_shortcuts_for_context">
    ? true
    : false;
declare const _agentShortcutContextRow: _CheckAgentShortcutContextRow;
true satisfies typeof _agentShortcutContextRow;

/**
 * Menu item shape from `agx_build_shortcut_menu(placement_types[])`.
 */
export interface AgentShortcutMenuResult {
  placement_type: string;
  menu_data: AgentShortcutCategory[];
}
type _CheckAgentShortcutMenuResult =
  AgentShortcutMenuResult extends DbRpcRow<"agx_build_shortcut_menu">
    ? true
    : false;
declare const _agentShortcutMenuResult: _CheckAgentShortcutMenuResult;
true satisfies typeof _agentShortcutMenuResult;

export interface AgentShortcutCategory {
  category: {
    id: string;
    label: string;
    description: string | null;
    icon_name: string | null;
    color: string | null;
    sort_order: number;
    parent_category_id: string | null;
    enabled_contexts: string[] | null;
  };
  shortcuts: AgentShortcutMenuItem[];
}

export interface AgentShortcutMenuItem {
  id: string;
  label: string;
  description: string | null;
  icon_name: string | null;
  keyboard_shortcut: string | null;
  sort_order: number;
  resolved_id: string | null;
  is_version: boolean;
  is_behind: boolean;
  agent_id: string | null;
  use_latest: boolean;
  scope_mappings: Record<string, string> | null;
  enabled_contexts: ShortcutContext[];
  result_display: ResultDisplay;
  auto_run: boolean;
  allow_chat: boolean;
  show_variables: boolean;
  apply_variables: boolean;
  use_pre_execution_input: boolean;
  agent: {
    name: string;
    variable_definitions: VariableDefinition[] | null;
    context_slots: ContextSlot[] | null;
  } | null;
}

// ---------------------------------------------------------------------------
// RPC — agx_get_user_shortcuts()
// ---------------------------------------------------------------------------

/**
 * Returned by `agx_get_user_shortcuts()`.
 * All shortcuts the current user owns or can admin, across all scopes.
 * Used by the management page to display and group shortcuts.
 */
export interface UserShortcutItem {
  id: string;
  label: string;
  description: string | null;
  icon_name: string | null;
  keyboard_shortcut: string | null;
  sort_order: number;
  category_id: string;
  category_label: string;

  // Agent reference
  agent_id: string | null;
  agent_name: string | null;
  agent_version_id: string | null;
  use_latest: boolean;

  // Scope — primary grouping key for the management UI
  scope_type:
    | "personal"
    | "organization"
    | "project"
    | "task"
    | "system";
  scope_name: string; // "Personal", org name, workspace name, etc.

  // Raw hierarchy fields
  user_id: string | null;
  organization_id: string | null;
  project_id: string | null;
  task_id: string | null;

  // Config
  enabled_contexts: string[];
  scope_mappings: Record<string, string> | null;
  result_display: string;
  allow_chat: boolean;
  auto_run: boolean;
  apply_variables: boolean;
  show_variables: boolean;
  use_pre_execution_input: boolean;
  is_active: boolean;

  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// RPC — agx_create_shortcut(...)
// ---------------------------------------------------------------------------

/**
 * Input for `agx_create_shortcut(...)`.
 * Quick-create from the agent page or a picker.
 * Automatically pins to the agent's current version unless use_latest = true.
 * Returns the new shortcut UUID.
 */
export interface CreateShortcutForAgentParams {
  p_agent_id: string;
  p_label: string;
  p_category_id: string;
  // Scope — set at most one non-null; omit all for personal
  p_user_id?: string | null;
  p_organization_id?: string | null;
  p_project_id?: string | null;
  p_task_id?: string | null;
  // Version reference
  p_use_latest?: boolean; // default false — pins to current version
}

// ---------------------------------------------------------------------------
// Runtime records & slice state
// ---------------------------------------------------------------------------

/**
 * Snapshot of field values before user edits.
 * Anchored to last clean fetch. Enables per-field undo.
 */
export type ShortcutFieldSnapshot = {
  [K in keyof AgentShortcut]?: AgentShortcut[K];
};

/**
 * Tracks which fields have been explicitly fetched from the DB.
 *   key set to true → field was fetched (null/empty IS the DB value)
 *   key absent     → field has not been fetched yet
 *
 * Uses FieldFlags (a Partial<Record<K, true>>) instead of Set<K> to keep the
 * Redux state JSON-serializable for persistence and the upcoming shared
 * agent-state package.
 */
export type ShortcutLoadedFields = FieldFlags<keyof AgentShortcut>;

export interface AgentShortcutRecord extends AgentShortcut {
  // Dirty tracking
  _dirty: boolean;
  _dirtyFields: FieldFlags<keyof AgentShortcut>;
  _fieldHistory: ShortcutFieldSnapshot;

  // Which fields have been explicitly fetched
  _loadedFields: ShortcutLoadedFields;

  // Per-record async state
  _loading: boolean;
  _error: string | null;
}

export interface AgentShortcutSliceState {
  // Normalised registry — keyed by shortcut id
  shortcuts: Record<string, AgentShortcutRecord>;

  // ID of the shortcut currently open in the editor
  activeShortcutId: string | null;

  // Phase tracking — prevents redundant RPC calls
  initialLoaded: boolean;
  contextLoaded: Record<string, boolean>; // key = "project:{id}" | "task:{id}"

  // Scope-aware phase tracking — keyed by scopeIndexKey({ scope, scopeId })
  scopeLoaded: Record<string, boolean>;

  // Global slice status
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}
