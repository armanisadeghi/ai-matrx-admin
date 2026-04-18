"use client";

import { createSelector } from "@reduxjs/toolkit";
import {
  computeMatchingEntityIdsFromAssignments,
  selectAllAssignments,
} from "@/features/agent-context/redux/scope";
import { selectAllProjects } from "@/features/agent-context/redux/projectsSlice";
import { selectAllTasks } from "@/features/agent-context/redux/tasksSlice";
import type { Task, TaskWithProject, Project, TaskSortConfig } from "../types";
import { sortTasks } from "../utils/taskSorting";
import {
  selectActiveProject,
  selectShowAllProjects,
  selectShowCompleted,
  selectSearchQuery,
  selectTaskFilter,
  selectSortBy,
  selectFilterScopeIds,
  selectFilterScopeMatchAll,
} from "./taskUiSlice";

export const UNASSIGNED_PROJECT_ID = "__unassigned__";

/**
 * Derive the hierarchical Project[] UI shape from the normalized agent-context
 * slices that are hydrated once by `fetchFullContext()` / `useNavTree()`.
 * This is the single source of truth — no duplicate network fetches.
 *
 * Orphaned tasks (project_id === null) surface under a virtual "Unassigned"
 * bucket so the /tasks route always shows them.
 */
export const selectProjects = createSelector(
  [selectAllProjects, selectAllTasks],
  (projectRecords, taskRecords): Project[] => {
    if (projectRecords.length === 0 && taskRecords.length === 0) return [];

    const byProjectId = new Map<string | null, typeof taskRecords>();
    for (const t of taskRecords) {
      const key = t.project_id ?? null;
      if (!byProjectId.has(key)) byProjectId.set(key, []);
      byProjectId.get(key)!.push(t);
    }

    const toUiTask = (rec: (typeof taskRecords)[number]): Task => ({
      id: rec.id,
      title: rec.title,
      completed: rec.status === "completed",
      description: (rec.description ?? "") as string,
      attachments: [],
      dueDate: rec.due_date ?? "",
      priority: (rec.priority as Task["priority"]) ?? null,
      assigneeId: rec.assignee_id ?? null,
      parentTaskId: rec.parent_task_id ?? null,
      subtasks: [],
      updatedAt: null,
      userId: rec.user_id ?? null,
      isPublic: false,
      settings: ((rec.settings as { labels?: string[] } | undefined) ??
        {}) as Task["settings"],
    });

    const buildNested = (tasks: typeof taskRecords): Task[] => {
      const map = new Map<string, Task>();
      const roots: Task[] = [];
      for (const t of tasks) map.set(t.id, toUiTask(t));
      for (const t of tasks) {
        const node = map.get(t.id)!;
        if (t.parent_task_id && map.has(t.parent_task_id)) {
          const parent = map.get(t.parent_task_id)!;
          parent.subtasks = [...(parent.subtasks ?? []), node];
        } else {
          roots.push(node);
        }
      }
      return roots;
    };

    const projects: Project[] = projectRecords
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({
        id: p.id,
        name: p.name,
        tasks: buildNested(byProjectId.get(p.id) ?? []),
      }));

    const orphans = byProjectId.get(null);
    if (orphans && orphans.length > 0) {
      projects.push({
        id: UNASSIGNED_PROJECT_ID,
        name: "Unassigned",
        tasks: buildNested(orphans),
      });
    }

    return projects;
  },
);

export const selectAllTasksFlat = createSelector(
  [selectProjects],
  (projects): TaskWithProject[] => {
    const out: TaskWithProject[] = [];
    for (const project of projects) {
      for (const task of project.tasks) {
        out.push({
          ...task,
          projectId: project.id,
          projectName: project.name,
        });
      }
    }
    return out;
  },
);

export const selectTaskIdsMatchingScopeFilter = createSelector(
  [selectFilterScopeIds, selectFilterScopeMatchAll, selectAllAssignments],
  (scopeIds, matchAll, assignments): string[] | null => {
    if (scopeIds.length === 0) return null;
    return computeMatchingEntityIdsFromAssignments(
      assignments,
      "task",
      scopeIds,
      matchAll,
    );
  },
);

/**
 * Master filtered + sorted task list for /tasks.
 * Composes view scope → search → hide-completed → status filter → scope filter → sort.
 */
export const selectFilteredTasks = createSelector(
  [
    selectProjects,
    selectShowAllProjects,
    selectActiveProject,
    selectSearchQuery,
    selectShowCompleted,
    selectTaskFilter,
    selectSortBy,
    selectTaskIdsMatchingScopeFilter,
  ],
  (
    projects,
    showAllProjects,
    activeProject,
    searchQuery,
    showCompleted,
    filter,
    sortBy,
    scopeTaskIds,
  ): TaskWithProject[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    let tasks: TaskWithProject[] = [];

    if (showAllProjects) {
      for (const project of projects) {
        for (const task of project.tasks) {
          tasks.push({
            ...task,
            projectId: project.id,
            projectName: project.name,
          });
        }
      }
    } else if (activeProject !== null) {
      const p = projects.find((pp) => pp.id === activeProject);
      if (p) {
        for (const task of p.tasks) {
          tasks.push({
            ...task,
            projectId: p.id,
            projectName: p.name,
          });
        }
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.projectName.toLowerCase().includes(q),
      );
    }

    if (!showCompleted) {
      tasks = tasks.filter((t) => !t.completed);
    }

    switch (filter) {
      case "incomplete":
        tasks = tasks.filter((t) => !t.completed);
        break;
      case "overdue":
        tasks = tasks.filter(
          (t) => !t.completed && t.dueDate && t.dueDate < todayStr,
        );
        break;
      default:
        break;
    }

    if (scopeTaskIds !== null) {
      const allowed = new Set(scopeTaskIds);
      tasks = tasks.filter((t) => allowed.has(t.id));
    }

    const sortConfig: TaskSortConfig = {
      primarySort: sortBy,
      direction: "asc",
    };
    return sortTasks(tasks, sortConfig);
  },
);
