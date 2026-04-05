/**
 * Agent Shortcuts — Redux Thunks
 *
 * App-load / context RPCs:
 *   buildAgentShortcutMenu      — hydrates shortcut + agent-definition slices at app load
 *   fetchShortcutsForContext     — workspace/project/task scoped shortcuts (on scope enter)
 *
 * Basic CRUD (direct Supabase client — no RPC needed, RLS handles auth):
 *   fetchFullShortcut            — SELECT * for a single shortcut, marks record clean
 *   saveShortcut                 — UPDATE all dirty fields with optimistic rollback
 *   saveShortcutField            — UPDATE single field with optimistic rollback
 *   createShortcut               — INSERT a fully specified shortcut
 *   deleteShortcut               — DELETE a shortcut
 *
 * RPC thunks:
 *   fetchUserShortcuts           — management page: all shortcuts the user owns/admins
 *   duplicateShortcut            — copy a shortcut (personal copy, label gets "(Copy)")
 *   createShortcutForAgent       — quick-create pinned to agent's current version
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "@/utils/supabase/client";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import type {
  AgentShortcut,
  AgentShortcutMenuResult,
  UserShortcutItem,
  CreateShortcutForAgentParams,
} from "./types";
import type { ResultDisplay } from "@/features/agents/utils/run-ui-utils";
import type { ShortcutContext } from "@/features/agents/utils/shortcut-context-utils";
import type { VariableDefinition } from "@/features/agents/types/agent-definition.types";
import type { ContextSlot } from "@/features/agents/types/agent-api-types";

function parseScopeMappings(raw: unknown): Record<string, string> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function parseVariableDefinitions(raw: unknown): VariableDefinition[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is VariableDefinition =>
      item !== null &&
      typeof item === "object" &&
      "name" in item &&
      typeof (item as { name?: unknown }).name === "string",
  );
}

function parseContextSlots(raw: unknown): ContextSlot[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is ContextSlot =>
      item !== null &&
      typeof item === "object" &&
      "key" in item &&
      typeof (item as { key?: unknown }).key === "string" &&
      "type" in item,
  );
}
import {
  upsertShortcut,
  upsertShortcuts,
  mergePartialShortcut,
  setShortcutField,
  setShortcutLoading,
  setShortcutError,
  setShortcutsStatus,
  setShortcutsError,
  markShortcutSaved,
  rollbackShortcutOptimisticUpdate,
  removeShortcut,
  setInitialLoaded,
  setContextLoaded,
} from "./slice";
import { mergePartialAgent } from "@/features/agents/redux/agent-definition/slice";
import {
  selectShortcutById,
  selectShortcutsInitialLoaded,
  selectIsContextLoaded,
} from "./selectors";
import {
  dbRowToAgentShortcut,
  agentShortcutToInsert,
  agentShortcutToUpdate,
} from "./converters";

type ThunkApi = { dispatch: AppDispatch; state: RootState };

// ---------------------------------------------------------------------------
// buildAgentShortcutMenu — app load
// ---------------------------------------------------------------------------

/**
 * Called once at app load. Calls `agx_build_shortcut_menu(placement_types[])`.
 *
 * On completion:
 *   1. All shortcuts are upserted into the shortcut slice (system shortcuts,
 *      userId/orgId hardcoded to null).
 *   2. For each shortcut's embedded agent data, mergePartialAgent is called
 *      for both live agents and version snapshots. Versions are distinguished
 *      by isVersion: true + parentAgentId, stored in the same agents map.
 *      The agent-definition slice has everything it needs to execute without
 *      any additional fetches.
 *
 * isVersion derivation: resolved_id !== agent_id (no agent_version_id on menu item).
 * categoryId: read from the parent category.id during iteration.
 */
export const buildAgentShortcutMenu = createAsyncThunk<
  AgentShortcutMenuResult[],
  { placementTypes?: string[] } | void,
  ThunkApi
>("agentShortcut/buildMenu", async (arg, { dispatch, getState }) => {
  if (selectShortcutsInitialLoaded(getState())) return [];

  dispatch(setShortcutsStatus("loading"));

  const placementTypes =
    arg && "placementTypes" in arg && arg.placementTypes
      ? arg.placementTypes
      : ["ai-action"];

  const { data, error } = await supabase.rpc("agx_build_shortcut_menu", {
    p_placement_types: placementTypes,
  });

  if (error) {
    dispatch(setShortcutsError(error.message));
    dispatch(setShortcutsStatus("failed"));
    throw error;
  }

  const results = (data ?? []) as unknown as AgentShortcutMenuResult[];
  const allShortcuts: AgentShortcut[] = [];

  for (const placement of results) {
    for (const categoryGroup of placement.menu_data) {
      const categoryId = categoryGroup.category.id;

      for (const item of categoryGroup.shortcuts) {
        const isVersion =
          item.resolved_id !== null &&
          item.agent_id !== null &&
          item.resolved_id !== item.agent_id;

        const shortcut: AgentShortcut = {
          id: item.id,
          categoryId,
          label: item.label,
          description: item.description,
          iconName: item.icon_name,
          keyboardShortcut: item.keyboard_shortcut,
          sortOrder: item.sort_order,

          agentId: item.agent_id,
          agentVersionId: isVersion ? item.resolved_id : null,
          useLatest: item.use_latest,

          enabledContexts: item.enabled_contexts as ShortcutContext[],
          scopeMappings: parseScopeMappings(item.scope_mappings),

          resultDisplay: item.result_display as ResultDisplay,
          allowChat: item.allow_chat,
          autoRun: item.auto_run,
          applyVariables: item.apply_variables,
          showVariables: item.show_variables,
          usePreExecutionInput: item.use_pre_execution_input,

          isActive: true,

          // System menu shortcuts — no user/org ownership
          userId: null,
          organizationId: null,
          workspaceId: null,
          projectId: null,
          taskId: null,

          createdAt: "",
          updatedAt: "",
        };

        allShortcuts.push(shortcut);

        if (item.resolved_id && item.agent) {
          const { name, variable_definitions, context_slots } = item.agent;
          dispatch(
            mergePartialAgent({
              id: item.resolved_id,
              name,
              variableDefinitions:
                parseVariableDefinitions(variable_definitions),
              contextSlots: parseContextSlots(context_slots),
              isVersion,
              parentAgentId: isVersion ? (item.agent_id ?? null) : null,
            }),
          );
        }
      }
    }
  }

  dispatch(upsertShortcuts(allShortcuts));
  dispatch(setInitialLoaded(true));
  dispatch(setShortcutsStatus("succeeded"));

  return results;
});

// ---------------------------------------------------------------------------
// fetchShortcutsForContext — scope enter
// ---------------------------------------------------------------------------

interface FetchShortcutsForContextArgs {
  workspaceId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
}

/**
 * Called when the user enters a workspace / project / task scope.
 * Returns additional shortcuts scoped to that context.
 *
 * Context key format: "workspace:{id}" | "project:{id}" | "task:{id}"
 * Checks state before firing to avoid redundant calls.
 */
export const fetchShortcutsForContext = createAsyncThunk<
  void,
  FetchShortcutsForContextArgs,
  ThunkApi
>(
  "agentShortcut/fetchForContext",
  async ({ workspaceId, projectId, taskId }, { dispatch, getState }) => {
    const contextKey = taskId
      ? `task:${taskId}`
      : projectId
        ? `project:${projectId}`
        : workspaceId
          ? `workspace:${workspaceId}`
          : "global";

    if (selectIsContextLoaded(getState(), contextKey)) return;

    const { data, error } = await supabase.rpc(
      "agx_get_shortcuts_for_context",
      {
        p_workspace_id: workspaceId ?? null,
        p_project_id: projectId ?? null,
        p_task_id: taskId ?? null,
      },
    );

    console.log("data", data);
    console.log("error", error);

    if (error) throw error;

    const rows = data ?? [];
    const shortcuts: AgentShortcut[] = [];

    for (const row of rows) {
      const isVersion =
        row.resolved_id !== null &&
        row.agent_id !== null &&
        row.resolved_id !== row.agent_id;

      const shortcut: AgentShortcut = {
        id: row.shortcut_id,
        categoryId: row.category_id,
        label: row.label,
        description: row.description,
        iconName: row.icon_name,
        keyboardShortcut: row.keyboard_shortcut,
        sortOrder: row.sort_order,

        agentId: row.agent_id,
        agentVersionId: isVersion ? row.resolved_id : null,
        useLatest: row.use_latest,

        enabledContexts: row.enabled_contexts as ShortcutContext[],
        scopeMappings: parseScopeMappings(row.scope_mappings),

        resultDisplay: row.result_display as ResultDisplay,
        allowChat: row.allow_chat,
        autoRun: row.auto_run,
        applyVariables: row.apply_variables,
        showVariables: row.show_variables,
        usePreExecutionInput: row.use_pre_execution_input,

        isActive: true,

        userId: row.shortcut_user_id,
        organizationId: row.shortcut_org_id,
        workspaceId: row.shortcut_workspace_id ?? workspaceId ?? null,
        projectId: row.shortcut_project_id ?? projectId ?? null,
        taskId: row.shortcut_task_id ?? taskId ?? null,

        createdAt: "",
        updatedAt: "",
      };

      shortcuts.push(shortcut);

      if (row.resolved_id && row.agent_variable_definitions !== undefined) {
        dispatch(
          mergePartialAgent({
            id: row.resolved_id,
            variableDefinitions: parseVariableDefinitions(
              row.agent_variable_definitions,
            ),
            contextSlots: parseContextSlots(row.agent_context_slots),
            isVersion,
            parentAgentId: isVersion ? (row.agent_id ?? null) : null,
          }),
        );
      }
    }

    dispatch(upsertShortcuts(shortcuts));
    dispatch(setContextLoaded({ key: contextKey, loaded: true }));
  },
);

// ---------------------------------------------------------------------------
// Basic CRUD
// ---------------------------------------------------------------------------

/**
 * Fetches a complete shortcut row and marks it clean.
 * Use when opening the shortcut editor.
 */
export const fetchFullShortcut = createAsyncThunk<void, string, ThunkApi>(
  "agentShortcut/fetchFull",
  async (shortcutId, { dispatch }) => {
    dispatch(setShortcutLoading({ id: shortcutId, loading: true }));

    const { data, error } = await supabase
      .from("agx_shortcut")
      .select("*")
      .eq("id", shortcutId)
      .single();

    dispatch(setShortcutLoading({ id: shortcutId, loading: false }));

    if (error) {
      dispatch(setShortcutError({ id: shortcutId, error: error.message }));
      throw error;
    }

    dispatch(upsertShortcut(dbRowToAgentShortcut(data)));
  },
);

/**
 * Saves all dirty fields for a shortcut in a single UPDATE.
 * Reads dirty values from state.
 */
export const saveShortcut = createAsyncThunk<void, string, ThunkApi>(
  "agentShortcut/save",
  async (shortcutId, { dispatch, getState }) => {
    const record = selectShortcutById(getState(), shortcutId);
    if (!record || !record._dirty) return;

    const dirtyPartial: Partial<AgentShortcut> = {};
    record._dirtyFields.forEach((field) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dirtyPartial as any)[field] = record[field];
    });

    const snapshot = { ...record._fieldHistory };

    dispatch(setShortcutLoading({ id: shortcutId, loading: true }));

    const { error } = await supabase
      .from("agx_shortcut")
      .update(agentShortcutToUpdate(dirtyPartial))
      .eq("id", shortcutId);

    dispatch(setShortcutLoading({ id: shortcutId, loading: false }));

    if (error) {
      dispatch(rollbackShortcutOptimisticUpdate({ id: shortcutId, snapshot }));
      dispatch(setShortcutError({ id: shortcutId, error: error.message }));
      throw error;
    }

    dispatch(markShortcutSaved({ id: shortcutId }));
  },
);

/**
 * Optimistically saves a single field.
 * Immediately updates state, persists to DB, rolls back on failure.
 */
export const saveShortcutField = createAsyncThunk<
  void,
  {
    shortcutId: string;
    field: keyof AgentShortcut;
    value: AgentShortcut[keyof AgentShortcut];
  },
  ThunkApi
>(
  "agentShortcut/saveField",
  async ({ shortcutId, field, value }, { dispatch, getState }) => {
    const existing = selectShortcutById(getState(), shortcutId);
    const snapshot = existing ? { [field]: existing[field] } : {};

    // Optimistic update
    dispatch(setShortcutField({ id: shortcutId, field, value }));

    const { error } = await supabase
      .from("agx_shortcut")
      .update(
        agentShortcutToUpdate({ [field]: value } as Partial<AgentShortcut>),
      )
      .eq("id", shortcutId);

    if (error) {
      dispatch(rollbackShortcutOptimisticUpdate({ id: shortcutId, snapshot }));
      dispatch(setShortcutError({ id: shortcutId, error: error.message }));
      throw error;
    }

    dispatch(markShortcutSaved({ id: shortcutId }));
  },
);

/**
 * Creates a new shortcut with full control over all fields.
 * userId is pulled from Redux if not provided in the shortcut data.
 * Returns the new shortcut id.
 */
export const createShortcut = createAsyncThunk<
  string,
  Omit<AgentShortcut, "id" | "createdAt" | "updatedAt">,
  ThunkApi
>("agentShortcut/create", async (shortcutData, { dispatch, getState }) => {
  const userId = selectUserId(getState());

  const draft: AgentShortcut = {
    ...shortcutData,
    id: "",
    // Default to current user as owner if no hierarchy set
    userId: shortcutData.userId ?? userId,
    createdAt: "",
    updatedAt: "",
  };

  const { data, error } = await supabase
    .from("agx_shortcut")
    .insert(agentShortcutToInsert(draft))
    .select()
    .single();

  if (error) throw error;

  const newShortcut = dbRowToAgentShortcut(data);
  dispatch(upsertShortcut(newShortcut));
  return newShortcut.id;
});

/**
 * Deletes a shortcut from the DB and removes it from state.
 */
export const deleteShortcut = createAsyncThunk<void, string, ThunkApi>(
  "agentShortcut/delete",
  async (shortcutId, { dispatch }) => {
    const { error } = await supabase
      .from("agx_shortcut")
      .delete()
      .eq("id", shortcutId);

    if (error) throw error;

    dispatch(removeShortcut(shortcutId));
  },
);

// ---------------------------------------------------------------------------
// RPC thunks
// ---------------------------------------------------------------------------

/**
 * Fetches all shortcuts the current user owns or can admin, across all scopes.
 * Returns the raw RPC rows for the management page — does NOT upsert into the
 * shortcut slice (the management page renders from this data directly, not from
 * the execution-oriented slice).
 *
 * The management page uses this to show grouped shortcuts by scope_type and
 * provide edit/delete/duplicate actions.
 */
export const fetchUserShortcuts = createAsyncThunk<
  UserShortcutItem[],
  void,
  ThunkApi
>("agentShortcut/fetchUserShortcuts", async () => {
  const { data, error } = await supabase.rpc("agx_get_user_shortcuts");

  if (error) throw error;

  return (data ?? []) as unknown as UserShortcutItem[];
});

/**
 * Duplicates a shortcut via the `agx_duplicate_shortcut` RPC.
 * The copy is personal (owned by current user, no hierarchy).
 * Agent reference is preserved. Keyboard shortcut is cleared. Label gets "(Copy)".
 * Returns the new shortcut id, and loads the copy into the slice.
 */
export const duplicateShortcut = createAsyncThunk<string, string, ThunkApi>(
  "agentShortcut/duplicate",
  async (shortcutId, { dispatch }) => {
    const { data, error } = await supabase.rpc("agx_duplicate_shortcut", {
      p_shortcut_id: shortcutId,
    });

    if (error) throw error;

    const newShortcutId = data as string;

    // Load the new copy into state so it's immediately accessible
    await dispatch(fetchFullShortcut(newShortcutId));

    return newShortcutId;
  },
);

/**
 * Quick-create a shortcut pinned to an agent's current version.
 * Scope is determined by which p_*_id param is set.
 * Defaults to personal (p_user_id = current user) if nothing specified.
 * Returns the new shortcut id, and loads the record into the slice.
 */
export const createShortcutForAgent = createAsyncThunk<
  string,
  CreateShortcutForAgentParams,
  ThunkApi
>("agentShortcut/createForAgent", async (params, { dispatch, getState }) => {
  const userId = selectUserId(getState());

  // Default to personal scope if no scope params provided
  const rpcParams: CreateShortcutForAgentParams = {
    ...params,
    p_user_id:
      params.p_user_id ??
      (!params.p_organization_id &&
      !params.p_workspace_id &&
      !params.p_project_id &&
      !params.p_task_id
        ? userId
        : null),
  };

  const { data, error } = await supabase.rpc("agx_create_shortcut", rpcParams);

  if (error) throw error;

  const newShortcutId = data as string;

  // Load the new shortcut into state
  await dispatch(fetchFullShortcut(newShortcutId));

  return newShortcutId;
});

/**
 * Merges fields from a management-page UserShortcutItem into the slice
 * without requiring a second full fetch.
 *
 * Call this after fetchUserShortcuts if you want the management data to be
 * reflected in the same slice used by context menus (e.g. the user edits a
 * shortcut on the management page and the context menu should see the update).
 */
export const syncUserShortcutToSlice = createAsyncThunk<
  void,
  UserShortcutItem,
  ThunkApi
>("agentShortcut/syncFromManagement", async (item, { dispatch }) => {
  dispatch(
    mergePartialShortcut({
      id: item.id,
      label: item.label,
      description: item.description,
      iconName: item.icon_name,
      keyboardShortcut: item.keyboard_shortcut,
      sortOrder: item.sort_order,
      categoryId: item.category_id,
      agentId: item.agent_id,
      agentVersionId: item.agent_version_id,
      useLatest: item.use_latest,
      enabledContexts: item.enabled_contexts as ShortcutContext[],
      scopeMappings: item.scope_mappings,
      resultDisplay: item.result_display as ResultDisplay,
      allowChat: item.allow_chat,
      autoRun: item.auto_run,
      applyVariables: item.apply_variables,
      showVariables: item.show_variables,
      usePreExecutionInput: item.use_pre_execution_input,
      isActive: item.is_active,
      userId: item.user_id,
      organizationId: item.organization_id,
      workspaceId: item.workspace_id,
      projectId: item.project_id,
      taskId: item.task_id,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }),
  );
});
