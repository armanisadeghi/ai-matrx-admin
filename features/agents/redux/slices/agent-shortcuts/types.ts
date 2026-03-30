import { ContextSlot } from "@/features/agents/types/agent-api-types";
import { VariableDefinition } from "@/features/agents/redux/slices/agent-definition/types";
import { ResultDisplay } from "@/features/agents/utils/run-ui-utils";
import { ShortcutContext } from "@/features/agents/utils/shortcut-context-utils";

export type { ResultDisplay, ShortcutContext };

// ---------------------------------------------------------------------------
// Full DB row — agent_shortcuts table
// ---------------------------------------------------------------------------

export interface AgentShortcut {
  // Identity
  id: string;
  category_id: string;
  label: string;
  description: string | null;
  icon_name: string | null;
  keyboard_shortcut: string | null;
  sort_order: number;

  // Agent
  agent_id: string | null;

  // Context & Scope
  enabled_contexts: ShortcutContext[];
  scope_mappings: Record<string, string> | null;
  // keys   = scope keys the UI provides (e.g. "selection", "active_doc")
  // values = variable/context_slot names on the agent

  // Execution
  result_display: ResultDisplay;
  allow_chat: boolean;
  auto_run: boolean;
  apply_variables: boolean;
  show_variables: boolean;
  use_pre_execution_input: boolean;

  // Status
  is_active: boolean;

  // Hierarchy (visibility scoping — each column is independently set)
  user_id: string | null; // null = system shortcut
  organization_id: string | null;
  workspace_id: string | null;
  project_id: string | null;
  task_id: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// RPC return types
// ---------------------------------------------------------------------------

/**
 * Returned by `get_agent_shortcuts_initial()`.
 *
 * Phase 1 fetch — called once per session. Returns all system shortcuts +
 * user's own + user's orgs' shortcuts. Includes agent execution data inline.
 */
export interface AgentShortcutInitial {
  // Shortcut identity
  shortcut_id: string;
  category_id: string;
  label: string;
  description: string | null;
  icon_name: string | null;
  keyboard_shortcut: string | null;
  sort_order: number;

  // Agent reference
  agent_id: string | null;

  // Context & scope
  enabled_contexts: ShortcutContext[];
  scope_mappings: Record<string, string> | null;

  // Execution behavior
  result_display: ResultDisplay;
  allow_chat: boolean;
  auto_run: boolean;
  apply_variables: boolean;
  show_variables: boolean;
  use_pre_execution_input: boolean;

  // Ownership (for UI grouping: "System" / "Mine" / "Org: X")
  shortcut_user_id: string | null; // null = system shortcut
  shortcut_org_id: string | null; // null = not org-scoped

  // Agent execution data (the 3 things needed to execute)
  agent_variable_definitions: VariableDefinition[] | null;
  agent_context_slots: ContextSlot[] | null;
}

/**
 * Returned by `get_agent_shortcuts_for_context(workspace_id?, project_id?, task_id?)`.
 *
 * Phase 2 fetch — called when user enters a workspace/project/task context.
 * Extends the initial payload with the full hierarchy IDs and shared-via-permissions shortcuts.
 */
export interface AgentShortcutContext extends AgentShortcutInitial {
  shortcut_workspace_id: string | null;
  shortcut_project_id: string | null;
  shortcut_task_id: string | null;
}

// ---------------------------------------------------------------------------
// Slice state
// ---------------------------------------------------------------------------

export interface AgentShortcutRecord extends AgentShortcut {
  _loading: boolean;
  _error: string | null;
}

export interface AgentShortcutSliceState {
  shortcuts: Record<string, AgentShortcutRecord>;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}
