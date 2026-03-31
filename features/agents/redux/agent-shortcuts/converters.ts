/**
 * Agent Shortcuts — DB ↔ Frontend Converters
 *
 * Rules:
 *  - Outer column names convert between snake_case (DB) and camelCase (frontend).
 *  - JSONB field contents (enabled_contexts, scope_mappings) are NOT key-converted.
 *
 * DB-managed fields excluded from ALL write payloads:
 *  - id          — DB generates on insert
 *  - created_at  — DB trigger
 *  - updated_at  — DB trigger (set_agent_shortcuts_updated_at)
 */

import type { Database } from "@/types/database.types";
import type { AgentShortcut } from "./types";
import type { ResultDisplay } from "@/features/agents/utils/run-ui-utils";
import type { ShortcutContext } from "@/features/agents/utils/shortcut-context-utils";

// ---------------------------------------------------------------------------
// Supabase row types
// ---------------------------------------------------------------------------

type ShortcutRow = Database["public"]["Tables"]["agent_shortcuts"]["Row"];
type ShortcutInsert = Omit<
  Database["public"]["Tables"]["agent_shortcuts"]["Insert"],
  "id" | "created_at" | "updated_at"
>;
type ShortcutUpdate = Omit<
  Database["public"]["Tables"]["agent_shortcuts"]["Update"],
  "id" | "created_at" | "updated_at"
>;

export type { ShortcutInsert, ShortcutUpdate };

// ---------------------------------------------------------------------------
// DB → Frontend
// ---------------------------------------------------------------------------

export function dbRowToAgentShortcut(row: ShortcutRow): AgentShortcut {
  return {
    id: row.id,
    categoryId: row.category_id,
    label: row.label,
    description: row.description,
    iconName: row.icon_name,
    keyboardShortcut: row.keyboard_shortcut,
    sortOrder: row.sort_order,

    agentId: row.agent_id,
    agentVersionId: row.agent_version_id ?? null,
    useLatest: row.use_latest ?? false,

    // JSONB — cast but not key-converted
    enabledContexts: (row.enabled_contexts as unknown as ShortcutContext[]) ?? [],
    scopeMappings: (row.scope_mappings as unknown as Record<string, string>) ?? null,

    resultDisplay: (row.result_display ?? "modal-full") as ResultDisplay,
    allowChat: row.allow_chat ?? true,
    autoRun: row.auto_run ?? true,
    applyVariables: row.apply_variables ?? true,
    showVariables: row.show_variables ?? false,
    usePreExecutionInput: row.use_pre_execution_input ?? false,

    isActive: row.is_active,

    userId: row.user_id,
    organizationId: row.organization_id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    taskId: row.task_id,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Frontend → DB (Insert)
// ---------------------------------------------------------------------------

export function agentShortcutToInsert(shortcut: AgentShortcut): ShortcutInsert {
  return {
    category_id: shortcut.categoryId,
    label: shortcut.label,
    description: shortcut.description,
    icon_name: shortcut.iconName,
    keyboard_shortcut: shortcut.keyboardShortcut,
    sort_order: shortcut.sortOrder,

    agent_id: shortcut.agentId,
    agent_version_id: shortcut.agentVersionId,
    use_latest: shortcut.useLatest,

    enabled_contexts: shortcut.enabledContexts as unknown as Database["public"]["Tables"]["agent_shortcuts"]["Insert"]["enabled_contexts"],
    scope_mappings: shortcut.scopeMappings as unknown as Database["public"]["Tables"]["agent_shortcuts"]["Insert"]["scope_mappings"],

    result_display: shortcut.resultDisplay,
    allow_chat: shortcut.allowChat,
    auto_run: shortcut.autoRun,
    apply_variables: shortcut.applyVariables,
    show_variables: shortcut.showVariables,
    use_pre_execution_input: shortcut.usePreExecutionInput,

    is_active: shortcut.isActive,

    user_id: shortcut.userId,
    organization_id: shortcut.organizationId,
    workspace_id: shortcut.workspaceId,
    project_id: shortcut.projectId,
    task_id: shortcut.taskId,
  };
}

// ---------------------------------------------------------------------------
// Frontend → DB (Update — partial)
// ---------------------------------------------------------------------------

export function agentShortcutToUpdate(
  partial: Partial<AgentShortcut>,
): ShortcutUpdate {
  const update: ShortcutUpdate = {};

  if (partial.categoryId !== undefined) update.category_id = partial.categoryId;
  if (partial.label !== undefined) update.label = partial.label;
  if (partial.description !== undefined) update.description = partial.description;
  if (partial.iconName !== undefined) update.icon_name = partial.iconName;
  if (partial.keyboardShortcut !== undefined) update.keyboard_shortcut = partial.keyboardShortcut;
  if (partial.sortOrder !== undefined) update.sort_order = partial.sortOrder;

  if (partial.agentId !== undefined) update.agent_id = partial.agentId;
  if (partial.agentVersionId !== undefined) update.agent_version_id = partial.agentVersionId;
  if (partial.useLatest !== undefined) update.use_latest = partial.useLatest;

  if (partial.enabledContexts !== undefined)
    update.enabled_contexts = partial.enabledContexts as unknown as Database["public"]["Tables"]["agent_shortcuts"]["Update"]["enabled_contexts"];
  if (partial.scopeMappings !== undefined)
    update.scope_mappings = partial.scopeMappings as unknown as Database["public"]["Tables"]["agent_shortcuts"]["Update"]["scope_mappings"];

  if (partial.resultDisplay !== undefined) update.result_display = partial.resultDisplay;
  if (partial.allowChat !== undefined) update.allow_chat = partial.allowChat;
  if (partial.autoRun !== undefined) update.auto_run = partial.autoRun;
  if (partial.applyVariables !== undefined) update.apply_variables = partial.applyVariables;
  if (partial.showVariables !== undefined) update.show_variables = partial.showVariables;
  if (partial.usePreExecutionInput !== undefined) update.use_pre_execution_input = partial.usePreExecutionInput;

  if (partial.isActive !== undefined) update.is_active = partial.isActive;

  if (partial.userId !== undefined) update.user_id = partial.userId;
  if (partial.organizationId !== undefined) update.organization_id = partial.organizationId;
  if (partial.workspaceId !== undefined) update.workspace_id = partial.workspaceId;
  if (partial.projectId !== undefined) update.project_id = partial.projectId;
  if (partial.taskId !== undefined) update.task_id = partial.taskId;

  return update;
}
