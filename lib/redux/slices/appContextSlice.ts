// lib/redux/slices/appContextSlice.ts
//
// Single slice for the unified "where are you working" context hierarchy.
//
// Hierarchy (mirrors the Context Engine schema):
//   auth.users
//   └── organizations
//       └── workspaces  (nestable — parent_workspace_id)
//           └── projects
//               └── tasks  (nestable — parent_task_id)
//                   └── conversations  (active conversation within a task/project)
//
// All fields are nullable — having none means the scope is just the current user.
// Fields are additive; setting org narrows scope to org-wide; setting project
// narrows further; etc.
//
// This is the single source of truth for scope context in call-api.ts.
// Do NOT create separate slices for org, workspace, project, or task.

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AppContextState {
  /** Currently active organization */
  organization_id: string | null;

  /** Currently active workspace (nestable, lives under an org) */
  workspace_id: string | null;

  /** Currently active project (lives under a workspace) */
  project_id: string | null;

  /** Currently active task (nestable, lives under a project) */
  task_id: string | null;

  /** Currently active conversation */
  conversation_id: string | null;
}

const initialState: AppContextState = {
  organization_id: null,
  workspace_id: null,
  project_id: null,
  task_id: null,
  conversation_id: null,
};

const appContextSlice = createSlice({
  name: "appContext",
  initialState,
  reducers: {
    setOrganization: (state, action: PayloadAction<string | null>) => {
      state.organization_id = action.payload;
      // Narrowing the org resets everything below it
      state.workspace_id = null;
      state.project_id = null;
      state.task_id = null;
      state.conversation_id = null;
    },
    setWorkspace: (state, action: PayloadAction<string | null>) => {
      state.workspace_id = action.payload;
      // Narrowing the workspace resets everything below it
      state.project_id = null;
      state.task_id = null;
      state.conversation_id = null;
    },
    setProject: (state, action: PayloadAction<string | null>) => {
      state.project_id = action.payload;
      // Narrowing the project resets task + conversation
      state.task_id = null;
      state.conversation_id = null;
    },
    setTask: (state, action: PayloadAction<string | null>) => {
      state.task_id = action.payload;
      // Narrowing the task resets the conversation
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
      if (action.payload.workspace_id !== undefined)
        state.workspace_id = action.payload.workspace_id;
      if (action.payload.project_id !== undefined)
        state.project_id = action.payload.project_id;
      if (action.payload.task_id !== undefined)
        state.task_id = action.payload.task_id;
      if (action.payload.conversation_id !== undefined)
        state.conversation_id = action.payload.conversation_id;
    },
    clearContext: () => initialState,
  },
});

export const {
  setOrganization,
  setWorkspace,
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

export const selectWorkspaceId = (state: StateWithAppContext): string | null =>
  state.appContext.workspace_id;

export const selectProjectId = (state: StateWithAppContext): string | null =>
  state.appContext.project_id;

export const selectTaskId = (state: StateWithAppContext): string | null =>
  state.appContext.task_id;

export const selectConversationId = (
  state: StateWithAppContext,
): string | null => state.appContext.conversation_id;

/**
 * Returns the full context object reference directly from state.
 * Stable — only changes when a context field is actually updated.
 * Only use when you need all five fields at once; prefer individual
 * primitive selectors (selectOrganizationId, etc.) otherwise.
 */
export const selectAppContext = (state: StateWithAppContext): AppContextState =>
  state.appContext;
