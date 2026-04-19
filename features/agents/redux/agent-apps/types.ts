/**
 * Agent Apps — Redux Types (scaffold)
 *
 * Ships alongside the Redux unification as a sibling to `agent-shortcuts/`.
 * Per the mental model (`features/agents/agent-system-mental-model.md`):
 *
 *   An App is a custom UI for a specific workflow. Where a Shortcut auto-fills
 *   variables, an App provides a different way to supply them — often one that
 *   doesn't look like AI at all. Apps can embed Shortcuts; Shortcuts inside an
 *   App can invoke agents from other Apps.
 *
 * This file is structurally identical to `agent-shortcuts/types.ts` so the
 * feature can light up by plugging in a real DB table + RPC set. The shape is
 * provisional — field set will tighten when the App backend lands. Thunks in
 * `thunks.ts` are stubs that throw.
 */

import type { JsonToUnknown } from "@/types/supabase-rpc";
import type { FieldFlags } from "@/features/agents/redux/shared/field-flags";

// ---------------------------------------------------------------------------
// Domain type — provisional until agx_app / cx_app table lands
// ---------------------------------------------------------------------------

/**
 * How this App was authored. Maps to the three creation paths in the mental
 * model: start from a template, describe your vision (AI-built), build custom.
 */
export type AgentAppOrigin = "template" | "ai_generated" | "custom";

export interface AgentApp {
  // Identity
  id: string;
  label: string;
  description: string | null;
  iconName: string | null;

  // Authoring
  origin: AgentAppOrigin;
  templateId: string | null; // present when origin === "template"
  sourceCode: string | null; // present when origin === "custom" or "ai_generated" (JSX/TSX)

  // Primary agent (the agent that produces the App's main artifact).
  // Uses the same version-reference pattern as shortcuts: Apps must pin to a
  // specific version because their UI depends on the agent's variable shape.
  primaryAgentId: string | null;
  primaryAgentVersionId: string | null;
  useLatest: boolean;

  // Embedded shortcut ids. Shortcut definitions live in agent-shortcuts/ —
  // this is just the membership list.
  embeddedShortcutIds: string[];

  // Scope mappings — how UI context on the App's surface binds to
  // variables of the primary agent (mirrors shortcut scopeMappings).
  scopeMappings: Record<string, string> | null;

  // Status
  isActive: boolean;
  isPublic: boolean;

  // Hierarchy
  userId: string | null;
  organizationId: string | null;
  projectId: string | null;
  taskId: string | null;

  // Timestamps (DB-managed)
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Placeholder RPC row shapes — DbRpcRow-wrapped to match shortcut convention
// ---------------------------------------------------------------------------

/**
 * Placeholder for the eventual `agx_get_apps_initial()` RPC return row.
 * Shape is provisional; adjust when the RPC lands.
 */
export interface AgentAppInitialRow {
  app_id: string;
  label: string;
  description: string | null;
  icon_name: string | null;

  origin: AgentAppOrigin;
  template_id: string | null;
  source_code: string | null;

  primary_agent_id: string | null;
  primary_agent_version_id: string | null;
  use_latest: boolean;

  embedded_shortcut_ids: string[];
  scope_mappings: Record<string, string> | null;

  is_active: boolean;
  is_public: boolean;

  user_id: string | null;
  organization_id: string | null;
  project_id: string | null;
  task_id: string | null;

  created_at: string;
  updated_at: string;
}

// NOTE: When the backing RPC lands (e.g. `agx_get_apps_initial()`), replace
// this with `DbRpcRow<"agx_get_apps_initial">` so the type is derived from
// the generated DB function signature instead of the manual row interface.
export type AgentAppInitialRpcRow = JsonToUnknown<AgentAppInitialRow>;

// ---------------------------------------------------------------------------
// Runtime records & slice state
// ---------------------------------------------------------------------------

export type AppFieldSnapshot = {
  [K in keyof AgentApp]?: AgentApp[K];
};

export type AppLoadedFields = FieldFlags<keyof AgentApp>;

export interface AgentAppRecord extends AgentApp {
  _dirty: boolean;
  _dirtyFields: FieldFlags<keyof AgentApp>;
  _fieldHistory: AppFieldSnapshot;
  _loadedFields: AppLoadedFields;
  _loading: boolean;
  _error: string | null;
}

export interface AgentAppSliceState {
  apps: Record<string, AgentAppRecord>;
  activeAppId: string | null;
  initialLoaded: boolean;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}
