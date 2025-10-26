// Project service for database operations
import { supabase } from '@/utils/supabase/client';
import type { DatabaseProject, ProjectWithTasks } from '../types';

/**
 * Create a new project
 */
export async function createProject(
  name: string, 
  description?: string
): Promise<DatabaseProject | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return null;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description: description || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception creating project:', error);
    return null;
  }
}

/**
 * Create default "Personal" project if none exist
 */
export async function ensureDefaultProject(): Promise<DatabaseProject | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // Check if user has any projects
    const { data: existingProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('created_by', user.id)
      .limit(1);

    // If they have projects, don't create default
    if (existingProjects && existingProjects.length > 0) {
      return null;
    }

    // Create default "Personal" project
    return await createProject('Personal', 'Your personal tasks');
  } catch (error) {
    console.error('Exception ensuring default project:', error);
    return null;
  }
}

/**
 * Get all projects for current user
 */
export async function getUserProjects(): Promise<DatabaseProject[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching projects:', error);
    return [];
  }
}

/**
 * Get projects with their tasks - OPTIMIZED single query with JOIN
 * This is significantly faster than making 2 separate queries
 */
export async function getProjectsWithTasks(): Promise<ProjectWithTasks[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return [];
    }

    // Single optimized query - fetch projects with their tasks in one go
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        tasks (*)
      `)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('Error fetching projects with tasks:', projectsError);
      return [];
    }

    if (!projects || projects.length === 0) {
      return [];
    }

    // Data is already joined, just ensure proper typing
    return projects as ProjectWithTasks[];
  } catch (error) {
    console.error('Exception fetching projects with tasks:', error);
    return [];
  }
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  updates: { name?: string; description?: string }
): Promise<DatabaseProject | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception updating project:', error);
    return null;
  }
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Error deleting project:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception deleting project:', error);
    return false;
  }
}
