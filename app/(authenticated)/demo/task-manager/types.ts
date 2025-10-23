// types.ts
import { ReactNode } from 'react';
import type { DatabaseTask, DatabaseProject } from './types/database';

// UI-friendly task type (maps from database)
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  description: string;
  attachments: string[];
  dueDate: string;
}

// UI-friendly project type (maps from database)
export interface Project {
  id: string;
  name: string;
  tasks: Task[];
}

// Extended types for UI
export interface TaskWithProject extends Task {
  projectId: string;
  projectName: string;
}

// Filter types
export type TaskFilterType = 'all' | 'completed' | 'incomplete' | 'overdue';

// Context types
export interface TaskContextType {
  // State
  projects: Project[];
  loading: boolean;
  newProjectName: string;
  expandedProjects: string[];
  expandedTasks: string[];
  activeProject: string | null;
  newTaskTitle: string;
  filter: TaskFilterType;
  showAllProjects: boolean;
  
  // Setters
  setNewProjectName: (name: string) => void;
  setNewTaskTitle: (title: string) => void;
  setActiveProject: (projectId: string) => void;
  setFilter: (filter: TaskFilterType) => void;
  setShowAllProjects: (show: boolean) => void;
  
  // Actions
  toggleProjectExpand: (projectId: string) => void;
  toggleTaskExpand: (taskId: string) => void;
  addProject: (e: React.FormEvent) => void;
  deleteProject: (projectId: string, e: React.MouseEvent) => void;
  addTask: (e: React.FormEvent) => void;
  toggleTaskComplete: (projectId: string, taskId: string) => void;
  updateTaskDescription: (projectId: string, taskId: string, description: string) => void;
  updateTaskDueDate: (projectId: string, taskId: string, dueDate: string) => void;
  deleteTask: (projectId: string, taskId: string, e: React.MouseEvent) => void;
  addAttachment: (projectId: string, taskId: string, e: React.MouseEvent) => void;
  removeAttachment: (projectId: string, taskId: string, attachmentName: string) => void;
  copyTaskToClipboard: (task: TaskWithProject, e: React.MouseEvent) => void;
  getFilteredTasks: () => TaskWithProject[];
  refresh: () => void;
}

export interface TaskProviderProps {
  children: ReactNode;
}

// Component prop types
export interface TaskItemProps {
  task: TaskWithProject;
}

export interface TaskListProps {
  tasks: TaskWithProject[];
}

export interface TaskDetailsProps {
  task: TaskWithProject;
}

// Utility functions to convert between database and UI types
export function dbTaskToTask(dbTask: DatabaseTask): Task {
  return {
    id: dbTask.id,
    title: dbTask.title,
    completed: dbTask.status === 'completed',
    description: dbTask.description || '',
    attachments: [], // TODO: Load from task_attachments table
    dueDate: dbTask.due_date || '',
  };
}

export function dbProjectToProject(dbProject: DatabaseProject, tasks: DatabaseTask[]): Project {
  return {
    id: dbProject.id,
    name: dbProject.name,
    tasks: tasks.map(dbTaskToTask),
  };
}