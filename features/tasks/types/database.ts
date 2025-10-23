// Database types for task management
// Matching the ACTUAL database schema

export interface DatabaseProject {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseTask {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  status: string; // 'incomplete' | 'completed'
  due_date: string | null;
  user_id: string | null; // ← This is the correct column name!
  authenticated_read: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  file_path: string;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string | null;
  assigned_by: string | null;
  assigned_at: string;
}

// Joined types for easier use in UI
export interface ProjectWithTasks extends DatabaseProject {
  tasks: DatabaseTask[];
}

// Simple task creation interface for external use (AI, etc.)
export interface CreateTaskInput {
  title: string;
  description?: string | null;
  project_id?: string | null;
  due_date?: string | null;
  status?: string;
  user_id?: string | null;
  authenticated_read?: boolean | null;
}

// Full task creation with all options
export interface CreateTaskOptions {
  projectId?: string;
  description?: string;
  dueDate?: string;
}
