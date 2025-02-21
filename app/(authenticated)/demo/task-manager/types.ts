// types.ts
import { ReactNode } from 'react';

// Basic entity types
export interface Task {
  id: number;
  title: string;
  completed: boolean;
  description: string;
  attachments: string[];
  dueDate: string;
}

export interface Project {
  id: number;
  name: string;
  tasks: Task[];
}

// Extended types for UI
export interface TaskWithProject extends Task {
  projectId: number;
  projectName: string;
}

// Filter types
export type TaskFilterType = 'all' | 'completed' | 'incomplete' | 'overdue';

// Context types
export interface TaskContextType {
  // State
  projects: Project[];
  newProjectName: string;
  expandedProjects: number[];
  expandedTasks: number[];
  activeProject: number | null;
  newTaskTitle: string;
  filter: TaskFilterType;
  showAllProjects: boolean;
  
  // Setters
  setNewProjectName: (name: string) => void;
  setNewTaskTitle: (title: string) => void;
  setActiveProject: (projectId: number) => void;
  setFilter: (filter: TaskFilterType) => void;
  setShowAllProjects: (show: boolean) => void;
  
  // Actions
  toggleProjectExpand: (projectId: number) => void;
  toggleTaskExpand: (taskId: number) => void;
  addProject: (e: React.FormEvent) => void;
  deleteProject: (projectId: number, e: React.MouseEvent) => void;
  addTask: (e: React.FormEvent) => void;
  toggleTaskComplete: (projectId: number, taskId: number) => void;
  updateTaskDescription: (projectId: number, taskId: number, description: string) => void;
  updateTaskDueDate: (projectId: number, taskId: number, dueDate: string) => void;
  deleteTask: (projectId: number, taskId: number, e: React.MouseEvent) => void;
  addAttachment: (projectId: number, taskId: number, e: React.MouseEvent) => void;
  removeAttachment: (projectId: number, taskId: number, attachmentName: string) => void;
  copyTaskToClipboard: (task: TaskWithProject, e: React.MouseEvent) => void;
  getFilteredTasks: () => TaskWithProject[];
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