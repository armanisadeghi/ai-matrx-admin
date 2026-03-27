// Task service for database operations
import { supabase } from '@/utils/supabase/client';
import { requireUserId } from '@/utils/auth/getUserId';
import { getSharedWithMe } from '@/utils/permissions/service';
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
    const userId = requireUserId();
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
        user_id: userId,
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
    const userId = requireUserId();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
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
    // If assignee is changing, get the current task first for comparison
    let previousAssigneeId: string | null = null;
    if (updates.assignee_id !== undefined) {
      const { data: currentTask } = await supabase
        .from('tasks')
        .select('assignee_id')
        .eq('id', taskId)
        .single();
      previousAssigneeId = currentTask?.assignee_id || null;
    }

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

    // Send assignment notification if assignee changed to someone new
    if (
      updates.assignee_id &&
      updates.assignee_id !== previousAssigneeId &&
      data
    ) {
      // Fire and forget - don't block the update on notification
      sendTaskAssignmentNotification(data).catch((err) => {
        console.error('Error sending task assignment notification:', err);
      });
    }

    return data;
  } catch (error) {
    console.error('Exception updating task:', error);
    return null;
  }
}

/**
 * Send task assignment notification (internal helper)
 */
async function sendTaskAssignmentNotification(task: DatabaseTask): Promise<void> {
  if (!task.assignee_id) return;

  try {
    await fetch('/api/notifications/task-assigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assigneeId: task.assignee_id,
        taskTitle: task.title,
        taskId: task.id,
        taskDescription: task.description,
      }),
    });
  } catch (error) {
    console.error('Failed to send task assignment notification:', error);
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
 * Get tasks explicitly shared with the current user via direct permission grants.
 * Does not include tasks accessible via project/workspace/org hierarchy —
 * those appear automatically in the normal task queries via RLS.
 *
 * Uses the shared permissions service to get grant IDs, then fetches full rows.
 * RLS on tasks ensures only currently-accessible rows are returned.
 */
export async function getSharedWithMeTasks(): Promise<DatabaseTask[]> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return [];

    const grants = await getSharedWithMe('tasks');
    if (grants.length === 0) return [];

    const taskIds = grants.map((g) => g.resourceId);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .in('id', taskIds)
      .neq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching shared tasks:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching shared tasks:', error);
    return [];
  }
}

// ============================================================================
// Task-specific Sharing Helpers (wrap the universal Phase 1 RPCs)
// ============================================================================

export interface TaskShareResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Share a task with a specific user.
 * Wraps share_resource_with_user() — ownership validated server-side.
 */
export async function shareTask(
  taskId: string,
  targetUserId: string,
  level: 'viewer' | 'editor' | 'admin' = 'viewer'
): Promise<TaskShareResult> {
  const { data, error } = await supabase.rpc('share_resource_with_user', {
    p_resource_type: 'tasks',
    p_resource_id: taskId,
    p_target_user_id: targetUserId,
    p_permission_level: level,
  });
  if (error) return { success: false, error: error.message };
  return { success: data?.success ?? false, message: data?.message, error: data?.error };
}

/**
 * Make a task publicly accessible (sets is_public = true on the task row).
 */
export async function makeTaskPublic(taskId: string): Promise<TaskShareResult> {
  const { data, error } = await supabase.rpc('make_resource_public', {
    p_resource_type: 'tasks',
    p_resource_id: taskId,
  });
  if (error) return { success: false, error: error.message };
  return { success: data?.success ?? false, message: data?.message, error: data?.error };
}

/**
 * Make a task private (sets is_public = false on the task row).
 */
export async function makeTaskPrivate(taskId: string): Promise<TaskShareResult> {
  const { data, error } = await supabase.rpc('make_resource_private', {
    p_resource_type: 'tasks',
    p_resource_id: taskId,
  });
  if (error) return { success: false, error: error.message };
  return { success: data?.success ?? false, message: data?.message, error: data?.error };
}

/**
 * Revoke a user's access to a task.
 * Wraps revoke_resource_access() — ownership validated server-side.
 */
export async function revokeTaskAccess(
  taskId: string,
  targetUserId: string
): Promise<TaskShareResult> {
  const { data, error } = await supabase.rpc('revoke_resource_access', {
    p_resource_type: 'tasks',
    p_resource_id: taskId,
    p_target_user_id: targetUserId,
  });
  if (error) return { success: false, error: error.message };
  return { success: data?.success ?? false, message: data?.message, error: data?.error };
}

/**
 * Get all permissions for a task (owner-only).
 * Uses get_resource_permissions() SECURITY DEFINER RPC.
 */
export async function getTaskPermissions(taskId: string) {
  const { data, error } = await supabase.rpc('get_resource_permissions', {
    p_resource_type: 'tasks',
    p_resource_id: taskId,
  });
  if (error) {
    console.error('Error fetching task permissions:', error.message);
    return [];
  }
  return data || [];
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
        user_id
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
    const userId = requireUserId();
    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: userId,
        content,
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user_id
      `)
      .single();

    if (error) {
      console.error('Error creating task comment:', error.message);
      return null;
    }

    // Send comment notification to task owner
    if (data) {
      sendTaskCommentNotification(taskId, content).catch((err) => {
        console.error('Error sending comment notification:', err);
      });
    }

    return data;
  } catch (error) {
    console.error('Exception creating task comment:', error);
    return null;
  }
}

/**
 * Send task comment notification (internal helper)
 */
async function sendTaskCommentNotification(taskId: string, commentText: string): Promise<void> {
  try {
    // Get the task to find the owner
    const { data: task } = await supabase
      .from('tasks')
      .select('id, title, user_id')
      .eq('id', taskId)
      .single();

    if (!task?.user_id) return;

    await fetch('/api/notifications/comment-added', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceOwnerId: task.user_id,
        commentText,
        resourceTitle: task.title,
        resourceType: 'task',
        resourceId: task.id,
      }),
    });
  } catch (error) {
    console.error('Failed to send comment notification:', error);
  }
}
