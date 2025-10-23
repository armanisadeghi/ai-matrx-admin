// Simple task service for creating tasks from anywhere in the app
import { supabase } from '@/utils/supabase/client';
import type { CreateTaskInput, CreateTaskOptions, DatabaseTask } from '../types/database';

/**
 * Simple API for creating tasks from anywhere in the app.
 * Perfect for AI-generated tasks or quick task creation with minimal info.
 * 
 * @example
 * // Create a simple task
 * await createTask({ title: "Review the document" });
 * 
 * @example
 * // Create a task with more details
 * await createTask({
 *   title: "Analyze user feedback",
 *   description: "Review and categorize user feedback from last week",
 *   due_date: "2025-11-01"
 * });
 */
export async function createTask(input: CreateTaskInput): Promise<DatabaseTask | null> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return null;
    }

    // Create the task with minimal required fields
    const taskData: Partial<DatabaseTask> = {
      title: input.title,
      description: input.description || null,
      project_id: input.project_id || null,
      due_date: input.due_date || null,
      user_id: input.user_id || user.id,
      status: 'incomplete',
      authenticated_read: false,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception creating task:', error);
    return null;
  }
}

/**
 * Create a task with full options (internal use)
 */
export async function createTaskWithOptions(options: CreateTaskOptions): Promise<DatabaseTask | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return null;
    }

    const taskData: Partial<DatabaseTask> = {
      title: options.title,
      description: options.description || null,
      project_id: options.project_id || null,
      due_date: options.due_date || null,
      user_id: options.user_id || user.id,
      status: options.status || 'incomplete',
      authenticated_read: options.authenticated_read ?? false,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception creating task:', error);
    return null;
  }
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: string, 
  updates: Partial<Omit<DatabaseTask, 'id' | 'created_at' | 'updated_at'>>
): Promise<DatabaseTask | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
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
      console.error('Error deleting task:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception deleting task:', error);
    return false;
  }
}

/**
 * Get all tasks for current user
 */
export async function getUserTasks(): Promise<DatabaseTask[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching tasks:', error);
    return [];
  }
}

/**
 * Quick task creation hook - even simpler for AI use
 * Just provide a title and optional description
 */
export const quickCreateTask = async (
  title: string, 
  description?: string
): Promise<DatabaseTask | null> => {
  return createTask({ title, description });
};

