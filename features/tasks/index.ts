/**
 * Tasks Feature barrel.
 *
 * State lives in Redux at `features/tasks/redux/` — import selectors and
 * thunks directly from there. No Context wrapper.
 */

// Simple task creation (use these!)
export { createTask, quickCreateTask } from "./services/taskService";
export { useQuickTask } from "./hooks/useQuickTask";

// Full service APIs (for advanced use)
export * as TaskService from "./services/taskService";
export * as ProjectService from "./services/projectService";

// Database hooks (for building custom UIs)
export {
  useTasks,
  useProjects,
  useProjectsWithTasks,
} from "./hooks/useTaskManager";

// Redux — selectors, actions, thunks for all tasks-route state
export * from "./redux";

// Components
export { QuickTasksSheet } from "./components/QuickTasksSheet";

// Types
export type {
  CreateTaskInput,
  DatabaseTask,
  DatabaseProject,
  Task,
  Project,
  TaskWithProject,
  TaskFilterType,
} from "./types";
