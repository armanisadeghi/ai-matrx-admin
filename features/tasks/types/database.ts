// Database types for task management — aligned with `types/database.types.ts`

import type { Database } from "@/types/database.types";

export type DatabaseProject = Database["public"]["Tables"]["projects"]["Row"];

export type DatabaseTask = Database["public"]["Tables"]["tasks"]["Row"];

export type DatabaseTaskAttachment =
  Database["public"]["Tables"]["task_attachments"]["Row"];

export type DatabaseTaskComment =
  Database["public"]["Tables"]["task_comments"]["Row"];

export type DatabaseTaskAssignment =
  Database["public"]["Tables"]["task_assignments"]["Row"];

// Joined types for easier use in UI
export interface ProjectWithTasks extends DatabaseProject {
  tasks: DatabaseTask[];
}

// Simple task creation interface for external use (AI, etc.)
export interface CreateTaskInput {
  title: string;
  description?: string | null;
  project_id?: string | null;
  parent_task_id?: string | null; // For creating subtasks
  due_date?: string | null;
  priority?: "low" | "medium" | "high" | null;
  assignee_id?: string | null;
  status?: string;
  user_id?: string | null;
}

// Full task creation with all options
export interface CreateTaskOptions {
  projectId?: string;
  description?: string;
  dueDate?: string;
}
