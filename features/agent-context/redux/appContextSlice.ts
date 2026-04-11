// features/context/redux/appContextSlice.ts
//
// Single slice for the unified "where are you working" context hierarchy.
//
// Hierarchy (post-migration — workspaces removed):
//   auth.users
//   └── organizations
//       └── projects
//           └── tasks  (nestable — parent_task_id)
//               └── conversations  (active conversation within a task/project)
//
// All fields are nullable — having none means the scope is just the current user.
// Fields are additive; setting org narrows scope to org-wide; setting project
// narrows further; etc.
//
// This is the single source of truth for scope context in call-api.ts.
// Do NOT create separate slices for org, project, or task.

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AppContextState {
  /** Currently active organization */
  organization_id: string | null;
  organization_name: string | null;

  /**
   * Scope selections — keyed by scope type id, value is selected scope id.
   * Scopes sit between organization and project in the hierarchy.
   * NEVER skip scopes when both org and project are present.
   */
  scope_selections: Record<string, string | null>;

  /** Currently active project (lives under an org, scoped by scope_selections) */
  project_id: string | null;
  project_name: string | null;

  /** Currently active task (nestable, lives under a project) */
  task_id: string | null;
  task_name: string | null;

  /** Currently active conversation */
  conversation_id: string | null;
}

const initialState: AppContextState = {
  organization_id: null,
  organization_name: null,
  scope_selections: {},
  project_id: null,
  project_name: null,
  task_id: null,
  task_name: null,
  conversation_id: null,
};

const appContextSlice = createSlice({
  name: "appContext",
  initialState,
  reducers: {
    setOrganization: (
      state,
      action: PayloadAction<{ id: string | null; name?: string | null }>,
    ) => {
      state.organization_id = action.payload.id;
      state.organization_name = action.payload.name ?? null;
      state.scope_selections = {};
      state.project_id = null;
      state.project_name = null;
      state.task_id = null;
      state.task_name = null;
      state.conversation_id = null;
    },
    setScopeSelections: (
      state,
      action: PayloadAction<Record<string, string | null>>,
    ) => {
      state.scope_selections = action.payload;
      state.project_id = null;
      state.project_name = null;
      state.task_id = null;
      state.task_name = null;
    },
    setProject: (
      state,
      action: PayloadAction<{ id: string | null; name?: string | null }>,
    ) => {
      state.project_id = action.payload.id;
      state.project_name = action.payload.name ?? null;
      state.task_id = null;
      state.task_name = null;
      state.conversation_id = null;
    },
    setTask: (
      state,
      action: PayloadAction<{ id: string | null; name?: string | null }>,
    ) => {
      state.task_id = action.payload.id;
      state.task_name = action.payload.name ?? null;
      state.conversation_id = null;
    },
    setConversation: (state, action: PayloadAction<string | null>) => {
      state.conversation_id = action.payload;
    },
    /**
     * Set multiple context fields at once without cascading resets.
     * Use this when restoring a full saved context (e.g. page reload,
     * deep-link navigation) where all values are already known.
     */
    setFullContext: (
      state,
      action: PayloadAction<Partial<AppContextState>>,
    ) => {
      if (action.payload.organization_id !== undefined)
        state.organization_id = action.payload.organization_id;
      if (action.payload.organization_name !== undefined)
        state.organization_name = action.payload.organization_name;
      if (action.payload.scope_selections !== undefined)
        state.scope_selections = action.payload.scope_selections;
      if (action.payload.project_id !== undefined)
        state.project_id = action.payload.project_id;
      if (action.payload.project_name !== undefined)
        state.project_name = action.payload.project_name;
      if (action.payload.task_id !== undefined)
        state.task_id = action.payload.task_id;
      if (action.payload.task_name !== undefined)
        state.task_name = action.payload.task_name;
      if (action.payload.conversation_id !== undefined)
        state.conversation_id = action.payload.conversation_id;
    },
    clearContext: () => initialState,
  },
});

export const {
  setOrganization,
  setScopeSelections,
  setProject,
  setTask,
  setConversation,
  setFullContext,
  clearContext,
} = appContextSlice.actions;

export default appContextSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────

type StateWithAppContext = { appContext: AppContextState };

export const selectOrganizationId = (
  state: StateWithAppContext,
): string | null => state.appContext.organization_id;

export const selectScopeSelectionsContext = (
  state: StateWithAppContext,
): Record<string, string | null> => state.appContext.scope_selections;

export const selectProjectId = (state: StateWithAppContext): string | null =>
  state.appContext.project_id;

export const selectTaskId = (state: StateWithAppContext): string | null =>
  state.appContext.task_id;

export const selectConversationId = (
  state: StateWithAppContext,
): string | null => state.appContext.conversation_id;

export const selectOrganizationName = (
  state: StateWithAppContext,
): string | null => state.appContext.organization_name;

export const selectProjectName = (state: StateWithAppContext): string | null =>
  state.appContext.project_name;

export const selectTaskName = (state: StateWithAppContext): string | null =>
  state.appContext.task_name;

/**
 * Returns the full context object reference directly from state.
 * Stable — only changes when a context field is actually updated.
 * Only use when you need all fields at once; prefer individual
 * primitive selectors (selectOrganizationId, etc.) otherwise.
 */
export const selectAppContext = (state: StateWithAppContext): AppContextState =>
  state.appContext;
