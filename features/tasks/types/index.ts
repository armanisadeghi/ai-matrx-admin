// UI Types for Task Manager
import type { TaskSortField } from "./sort";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  description: string;
  attachments: string[];
  dueDate: string;
  priority?: "low" | "medium" | "high" | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  parentTaskId?: string | null;
  subtasks?: Task[];
  updatedAt?: string | null;
  userId?: string | null;
  isPublic?: boolean;
  settings?: { labels?: string[]; [key: string]: unknown };
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

export type TaskFilterType = "all" | "incomplete" | "overdue";

// Re-export database types
export * from "./database";

// Re-export sort types
export * from "./sort";
