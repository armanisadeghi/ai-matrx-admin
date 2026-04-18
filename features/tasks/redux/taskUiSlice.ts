"use client";

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { DatabaseTask, ProjectWithTasks } from "../types/database";
import type { TaskFilterType } from "../types";
import type { TaskSortField } from "../types/sort";

export interface TaskUiState {
  // Hierarchical data (source of truth for the tasks route UI)
  projectsWithTasks: ProjectWithTasks[];
  sharedTasks: DatabaseTask[];

  // Lifecycle
  loading: boolean;
  initialized: boolean;
  isCreatingProject: boolean;
  isCreatingTask: boolean;
  operatingTaskId: string | null;
  operatingProjectId: string | null;

  // Sidebar / view state
  activeProject: string | null;
  expandedProjects: string[];
  expandedTasks: string[];
  filter: TaskFilterType;
  showAllProjects: boolean;
  showCompleted: boolean;
  searchQuery: string;
  sortBy: TaskSortField;
  newProjectName: string;
  newTaskTitle: string;

  // Scope filter (sidebar) — view-only, does not write to any entity
  filterScopeIds: string[];
  filterScopeMatchAll: boolean;

  // Post-create handoff (for non-blocking "Edit details" banner)
  lastCreatedTaskId: string | null;
}

const initialState: TaskUiState = {
  projectsWithTasks: [],
  sharedTasks: [],

  loading: false,
  initialized: false,
  isCreatingProject: false,
  isCreatingTask: false,
  operatingTaskId: null,
  operatingProjectId: null,

  activeProject: null,
  expandedProjects: [],
  expandedTasks: [],
  filter: "all",
  showAllProjects: true,
  showCompleted: false,
  searchQuery: "",
  sortBy: "lastUpdated",
  newProjectName: "",
  newTaskTitle: "",

  filterScopeIds: [],
  filterScopeMatchAll: false,

  lastCreatedTaskId: null,
};

const slice = createSlice({
  name: "tasksUi",
  initialState,
  reducers: {
    // ─── Data hydration ─────────────────────────────────────────────────────
    setProjectsWithTasks(state, action: PayloadAction<ProjectWithTasks[]>) {
      state.projectsWithTasks = action.payload;
    },
    setSharedTasks(state, action: PayloadAction<DatabaseTask[]>) {
      state.sharedTasks = action.payload;
    },

    // Optimistic helpers for in-place mutation
    upsertTaskInProject(
      state,
      action: PayloadAction<{ projectId: string; task: DatabaseTask }>,
    ) {
      const { projectId, task } = action.payload;
      const proj = state.projectsWithTasks.find((p) => p.id === projectId);
      if (!proj) return;
      const tasks = (proj.tasks ?? []) as DatabaseTask[];
      const idx = tasks.findIndex((t) => t.id === task.id);
      if (idx >= 0) tasks[idx] = task;
      else tasks.push(task);
      proj.tasks = tasks;
    },
    replaceTaskId(
      state,
      action: PayloadAction<{ tempId: string; newTask: DatabaseTask }>,
    ) {
      const { tempId, newTask } = action.payload;
      for (const proj of state.projectsWithTasks) {
        const tasks = (proj.tasks ?? []) as DatabaseTask[];
        const idx = tasks.findIndex((t) => t.id === tempId);
        if (idx >= 0) {
          tasks[idx] = newTask;
          return;
        }
      }
    },
    removeTaskFromProjects(state, action: PayloadAction<string>) {
      const taskId = action.payload;
      for (const proj of state.projectsWithTasks) {
        proj.tasks = ((proj.tasks ?? []) as DatabaseTask[]).filter(
          (t) => t.id !== taskId,
        );
      }
    },
    patchTaskInProjects(
      state,
      action: PayloadAction<{ taskId: string; patch: Partial<DatabaseTask> }>,
    ) {
      const { taskId, patch } = action.payload;
      for (const proj of state.projectsWithTasks) {
        const tasks = (proj.tasks ?? []) as DatabaseTask[];
        const idx = tasks.findIndex((t) => t.id === taskId);
        if (idx >= 0) {
          tasks[idx] = { ...tasks[idx], ...patch };
          return;
        }
      }
    },
    moveTaskBetweenProjects(
      state,
      action: PayloadAction<{
        taskId: string;
        fromProjectId: string;
        toProjectId: string | null;
      }>,
    ) {
      const { taskId, fromProjectId, toProjectId } = action.payload;
      const from = state.projectsWithTasks.find((p) => p.id === fromProjectId);
      if (!from) return;
      const tasks = (from.tasks ?? []) as DatabaseTask[];
      const idx = tasks.findIndex((t) => t.id === taskId);
      if (idx < 0) return;
      const [task] = tasks.splice(idx, 1);
      from.tasks = tasks;
      if (toProjectId) {
        const to = state.projectsWithTasks.find((p) => p.id === toProjectId);
        if (to) {
          to.tasks = [...((to.tasks ?? []) as DatabaseTask[]), {
            ...task,
            project_id: toProjectId,
          }];
        }
      }
    },
    addProjectToList(state, action: PayloadAction<ProjectWithTasks>) {
      state.projectsWithTasks = [action.payload, ...state.projectsWithTasks];
    },
    patchProject(
      state,
      action: PayloadAction<{
        projectId: string;
        patch: Partial<ProjectWithTasks>;
      }>,
    ) {
      const { projectId, patch } = action.payload;
      const proj = state.projectsWithTasks.find((p) => p.id === projectId);
      if (proj) Object.assign(proj, patch);
    },
    removeProject(state, action: PayloadAction<string>) {
      state.projectsWithTasks = state.projectsWithTasks.filter(
        (p) => p.id !== action.payload,
      );
      if (state.activeProject === action.payload) state.activeProject = null;
    },

    // ─── Lifecycle ──────────────────────────────────────────────────────────
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setInitialized(state, action: PayloadAction<boolean>) {
      state.initialized = action.payload;
    },
    setIsCreatingProject(state, action: PayloadAction<boolean>) {
      state.isCreatingProject = action.payload;
    },
    setIsCreatingTask(state, action: PayloadAction<boolean>) {
      state.isCreatingTask = action.payload;
    },
    setOperatingTaskId(state, action: PayloadAction<string | null>) {
      state.operatingTaskId = action.payload;
    },
    setOperatingProjectId(state, action: PayloadAction<string | null>) {
      state.operatingProjectId = action.payload;
    },

    // ─── View state ─────────────────────────────────────────────────────────
    setActiveProject(state, action: PayloadAction<string | null>) {
      state.activeProject = action.payload;
    },
    toggleProjectExpand(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.expandedProjects = state.expandedProjects.includes(id)
        ? state.expandedProjects.filter((p) => p !== id)
        : [...state.expandedProjects, id];
    },
    setExpandedProjects(state, action: PayloadAction<string[]>) {
      state.expandedProjects = action.payload;
    },
    toggleTaskExpand(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.expandedTasks = state.expandedTasks.includes(id)
        ? state.expandedTasks.filter((t) => t !== id)
        : [...state.expandedTasks, id];
    },
    setFilter(state, action: PayloadAction<TaskFilterType>) {
      state.filter = action.payload;
    },
    setShowAllProjects(state, action: PayloadAction<boolean>) {
      state.showAllProjects = action.payload;
    },
    setShowCompleted(state, action: PayloadAction<boolean>) {
      state.showCompleted = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setSortBy(state, action: PayloadAction<TaskSortField>) {
      state.sortBy = action.payload;
    },
    setNewProjectName(state, action: PayloadAction<string>) {
      state.newProjectName = action.payload;
    },
    setNewTaskTitle(state, action: PayloadAction<string>) {
      state.newTaskTitle = action.payload;
    },

    // ─── Scope filter ───────────────────────────────────────────────────────
    setFilterScopeIds(state, action: PayloadAction<string[]>) {
      state.filterScopeIds = action.payload;
    },
    toggleFilterScopeId(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.filterScopeIds = state.filterScopeIds.includes(id)
        ? state.filterScopeIds.filter((s) => s !== id)
        : [...state.filterScopeIds, id];
    },
    clearFilterScopes(state) {
      state.filterScopeIds = [];
    },
    setFilterScopeMatchAll(state, action: PayloadAction<boolean>) {
      state.filterScopeMatchAll = action.payload;
    },

    // ─── Post-create ────────────────────────────────────────────────────────
    setLastCreatedTaskId(state, action: PayloadAction<string | null>) {
      state.lastCreatedTaskId = action.payload;
    },
  },
});

export const {
  setProjectsWithTasks,
  setSharedTasks,
  upsertTaskInProject,
  replaceTaskId,
  removeTaskFromProjects,
  patchTaskInProjects,
  moveTaskBetweenProjects,
  addProjectToList,
  patchProject,
  removeProject,
  setLoading,
  setInitialized,
  setIsCreatingProject,
  setIsCreatingTask,
  setOperatingTaskId,
  setOperatingProjectId,
  setActiveProject,
  toggleProjectExpand,
  setExpandedProjects,
  toggleTaskExpand,
  setFilter,
  setShowAllProjects,
  setShowCompleted,
  setSearchQuery,
  setSortBy,
  setNewProjectName,
  setNewTaskTitle,
  setFilterScopeIds,
  toggleFilterScopeId,
  clearFilterScopes,
  setFilterScopeMatchAll,
  setLastCreatedTaskId,
} = slice.actions;

export default slice.reducer;

// ─── Selectors ─────────────────────────────────────────────────────────────

type StateWithTasksUi = { tasksUi: TaskUiState };

export const selectTaskUi = (s: StateWithTasksUi) => s.tasksUi;
export const selectProjectsWithTasks = (s: StateWithTasksUi) =>
  s.tasksUi.projectsWithTasks;
export const selectSharedTasks = (s: StateWithTasksUi) => s.tasksUi.sharedTasks;
export const selectTasksLoading = (s: StateWithTasksUi) => s.tasksUi.loading;
export const selectTasksInitialized = (s: StateWithTasksUi) =>
  s.tasksUi.initialized;
export const selectIsCreatingProject = (s: StateWithTasksUi) =>
  s.tasksUi.isCreatingProject;
export const selectIsCreatingTask = (s: StateWithTasksUi) =>
  s.tasksUi.isCreatingTask;
export const selectOperatingTaskId = (s: StateWithTasksUi) =>
  s.tasksUi.operatingTaskId;
export const selectOperatingProjectId = (s: StateWithTasksUi) =>
  s.tasksUi.operatingProjectId;
export const selectActiveProject = (s: StateWithTasksUi) =>
  s.tasksUi.activeProject;
export const selectExpandedProjects = (s: StateWithTasksUi) =>
  s.tasksUi.expandedProjects;
export const selectExpandedTasks = (s: StateWithTasksUi) =>
  s.tasksUi.expandedTasks;
export const selectTaskFilter = (s: StateWithTasksUi) => s.tasksUi.filter;
export const selectShowAllProjects = (s: StateWithTasksUi) =>
  s.tasksUi.showAllProjects;
export const selectShowCompleted = (s: StateWithTasksUi) =>
  s.tasksUi.showCompleted;
export const selectSearchQuery = (s: StateWithTasksUi) => s.tasksUi.searchQuery;
export const selectSortBy = (s: StateWithTasksUi) => s.tasksUi.sortBy;
export const selectNewProjectName = (s: StateWithTasksUi) =>
  s.tasksUi.newProjectName;
export const selectNewTaskTitle = (s: StateWithTasksUi) =>
  s.tasksUi.newTaskTitle;
export const selectFilterScopeIds = (s: StateWithTasksUi) =>
  s.tasksUi.filterScopeIds;
export const selectFilterScopeMatchAll = (s: StateWithTasksUi) =>
  s.tasksUi.filterScopeMatchAll;
export const selectLastCreatedTaskId = (s: StateWithTasksUi) =>
  s.tasksUi.lastCreatedTaskId;
