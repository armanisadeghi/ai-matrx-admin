// UI Types for Task Manager
import { ReactNode } from 'react';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  description: string;
  attachments: string[];
  dueDate: string;
  priority?: 'low' | 'medium' | 'high' | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  parentTaskId?: string | null;
  subtasks?: Task[];
}

export interface Project {
  id: string;
  name: string;
  tasks: Task[];
}

export interface TaskWithProject extends Task {
  projectId: string;
  projectName: string;
}

export type TaskFilterType = 'all' | 'completed' | 'incomplete' | 'overdue';

export interface TaskContextType {
  projects: Project[];
  loading: boolean;
  // Operation states for loading feedback
  isCreatingProject: boolean;
  isCreatingTask: boolean;
  operatingTaskId: string | null;
  operatingProjectId: string | null;
  // UI state
  newProjectName: string;
  expandedProjects: string[];
  expandedTasks: string[];
  activeProject: string | null;
  newTaskTitle: string;
  filter: TaskFilterType;
  showAllProjects: boolean;
  // Actions
  setNewProjectName: (name: string) => void;
  setNewTaskTitle: (title: string) => void;
  setActiveProject: (projectId: string | null) => void;
  setFilter: (filter: TaskFilterType) => void;
  setShowAllProjects: (show: boolean) => void;
  toggleProjectExpand: (projectId: string) => void;
  toggleTaskExpand: (taskId: string) => void;
  addProject: (e: React.FormEvent) => Promise<void>;
  updateProject: (projectId: string, name: string) => Promise<void>;
  deleteProject: (projectId: string, e: React.MouseEvent) => Promise<void>;
  addTask: (e: React.FormEvent, description?: string, dueDate?: string, targetProjectId?: string) => Promise<string | null>;
  toggleTaskComplete: (projectId: string, taskId: string) => Promise<void>;
  updateTaskTitle: (projectId: string, taskId: string, title: string) => Promise<void>;
  updateTaskDescription: (projectId: string, taskId: string, description: string) => Promise<void>;
  updateTaskDueDate: (projectId: string, taskId: string, dueDate: string) => Promise<void>;
  deleteTask: (projectId: string, taskId: string, e: React.MouseEvent) => Promise<void>;
  addAttachment: (projectId: string, taskId: string, e: React.MouseEvent) => void;
  removeAttachment: (projectId: string, taskId: string, attachmentName: string) => void;
  copyTaskToClipboard: (task: TaskWithProject, e: React.MouseEvent) => Promise<void>;
  getFilteredTasks: () => TaskWithProject[];
  refresh: () => Promise<void>;
}

export interface TaskProviderProps {
  children: ReactNode;
}

// Re-export database types
export * from './database';
