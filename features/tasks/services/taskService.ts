// Task service for database operations
import { supabase } from '@/utils/supabase/client';
import type { DatabaseTask } from '../types';

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  project_id?: string | null;
  parent_task_id?: string | null;
  due_date?: string | null;
  priority?: 'low' | 'medium' | 'high' | null;
  assignee_id?: string | null;
  status?: 'incomplete' | 'completed';
  user_id?: string | null;
  authenticated_read?: boolean | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  project_id?: string | null;
  parent_task_id?: string | null;
  due_date?: string | null;
  priority?: 'low' | 'medium' | 'high' | null;
  assignee_id?: string | null;
  status?: 'incomplete' | 'completed';
  user_id?: string | null;
  authenticated_read?: boolean | null;
}

export interface CreateTaskOptions {
  projectId?: string;
  description?: string;
  dueDate?: string;
}

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<DatabaseTask | null> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error('User not authenticated:', userError?.message);
      return null;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: input.title,
        description: input.description || null,
        project_id: input.project_id || null,
        parent_task_id: input.parent_task_id || null,
        due_date: input.due_date || null,
        priority: input.priority || null,
        assignee_id: input.assignee_id || null,
        status: input.status || 'incomplete',
        user_id: userData.user.id,
        authenticated_read: input.authenticated_read ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception creating task:', error);
    return null;
  }
}

/**
 * Simplified task creation for quick adds (e.g., from AI or other features)
 * Only requires a title, everything else is optional
 */
export async function quickCreateTask(
  title: string,
  description: string = '',
  options?: CreateTaskOptions
): Promise<DatabaseTask | null> {
  return createTask({
    title,
    description: description || null,
    project_id: options?.projectId || null,
    due_date: options?.dueDate || null,
  });
}

/**
 * Get all tasks for the current user
 */
export async function getUserTasks(): Promise<DatabaseTask[]> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return [];
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching tasks:', error);
    return [];
  }
}

/**
 * Get tasks for a specific project
 */
export async function getProjectTasks(projectId: string): Promise<DatabaseTask[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching project tasks:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching project tasks:', error);
    return [];
  }
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: string,
  updates: UpdateTaskInput
): Promise<DatabaseTask | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception updating task:', error);
    return null;
  }
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception deleting task:', error);
    return false;
  }
}

/**
 * Get subtasks for a specific task
 */
export async function getSubtasks(taskId: string): Promise<DatabaseTask[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('parent_task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching subtasks:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching subtasks:', error);
    return [];
  }
}

/**
 * Create a subtask for a parent task
 */
export async function createSubtask(
  parentTaskId: string,
  title: string,
  description?: string
): Promise<DatabaseTask | null> {
  return createTask({
    title,
    description: description || null,
    parent_task_id: parentTaskId,
    status: 'incomplete',
  });
}

/**
 * Update subtask completion status
 */
export async function updateSubtaskStatus(
  subtaskId: string,
  completed: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: completed ? 'completed' : 'incomplete' })
      .eq('id', subtaskId);

    if (error) {
      console.error('Error updating subtask status:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception updating subtask status:', error);
    return false;
  }
}

/**
 * Delete a subtask
 */
export async function deleteSubtask(subtaskId: string): Promise<boolean> {
  return deleteTask(subtaskId);
}

/**
 * Get comments for a task
 */
export async function getTaskComments(taskId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('task_comments')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user_id,
        users:user_id (
          id,
          email
        )
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching task comments:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching task comments:', error);
    return [];
  }
}

/**
 * Create a comment on a task
 */
export async function createTaskComment(
  taskId: string,
  content: string
): Promise<any | null> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error('User not authenticated:', userError?.message);
      return null;
    }

    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: userData.user.id,
        content,
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user_id,
        users:user_id (
          id,
          email
        )
      `)
      .single();

    if (error) {
      console.error('Error creating task comment:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception creating task comment:', error);
    return null;
  }
}
