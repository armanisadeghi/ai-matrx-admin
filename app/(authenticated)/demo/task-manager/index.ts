/**
 * Task Manager - Easy Imports
 * 
 * Import what you need from this single file
 */

// Simple task creation (use these!)
export { createTask, quickCreateTask } from './services/taskService';
export { useQuickTask } from './hooks/useQuickTask';

// Full service APIs (for advanced use)
export * as TaskService from './services/taskService';
export * as ProjectService from './services/projectService';

// Database hooks (for building custom UIs)
export { useTasks, useProjects, useProjectsWithTasks } from './hooks/useTaskManager';

// Types
export type { 
  CreateTaskInput, 
  DatabaseTask, 
  DatabaseProject 
} from './types/database';

// Context (for using within the task manager UI)
export { useTaskContext, TaskProvider } from './context/TaskContext';

