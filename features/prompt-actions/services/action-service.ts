/**
 * Prompt Actions Service
 * 
 * CRUD operations for prompt actions
 */

import { supabase } from '@/utils/supabase/client';
import type {
  PromptAction,
  CreateActionPayload,
  UpdateActionPayload,
  ActionSummary,
} from '../types';

/**
 * Get a single action by ID
 */
export async function getAction(id: string): Promise<PromptAction | null> {
  try {
    const { data, error } = await supabase
      .from('prompt_actions')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Failed to get action:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to get action:', error);
    return null;
  }
}

/**
 * Get all actions for a user
 */
export async function getUserActions(userId: string): Promise<PromptAction[]> {
  try {
    const { data, error } = await supabase
      .from('prompt_actions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Failed to get user actions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get user actions:', error);
    return [];
  }
}

/**
 * Get public actions (available to all users)
 */
export async function getPublicActions(): Promise<PromptAction[]> {
  try {
    const { data, error } = await supabase
      .from('prompt_actions')
      .select('*')
      .eq('is_public', true)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Failed to get public actions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get public actions:', error);
    return [];
  }
}

/**
 * Get actions accessible to a user (their own + public)
 */
export async function getAccessibleActions(
  userId: string
): Promise<PromptAction[]> {
  try {
    const { data, error } = await supabase
      .from('prompt_actions')
      .select('*')
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Failed to get accessible actions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get accessible actions:', error);
    return [];
  }
}

/**
 * Get action summaries (lightweight data for lists)
 */
export async function getActionSummaries(
  userId: string
): Promise<ActionSummary[]> {
  try {
    const { data, error } = await supabase
      .from('prompt_actions')
      .select(
        'id, name, description, icon_name, tags, prompt_id, prompt_builtin_id, context_scopes, is_public'
      )
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Failed to get action summaries:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get action summaries:', error);
    return [];
  }
}

/**
 * Get actions by tag
 */
export async function getActionsByTag(
  tag: string,
  userId: string
): Promise<PromptAction[]> {
  try {
    const { data, error } = await supabase
      .from('prompt_actions')
      .select('*')
      .contains('tags', [tag])
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Failed to get actions by tag:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get actions by tag:', error);
    return [];
  }
}

/**
 * Get actions for a specific prompt
 */
export async function getActionsForPrompt(
  promptId: string,
  userId: string
): Promise<PromptAction[]> {
  try {
    const { data, error } = await supabase
      .from('prompt_actions')
      .select('*')
      .or(`prompt_id.eq.${promptId},prompt_builtin_id.eq.${promptId}`)
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Failed to get actions for prompt:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get actions for prompt:', error);
    return [];
  }
}

/**
 * Create a new action
 */
export async function createAction(
  payload: CreateActionPayload,
  userId: string
): Promise<PromptAction | null> {
  try {
    // Validate: must have either prompt_id or prompt_builtin_id
    if (!payload.prompt_id && !payload.prompt_builtin_id) {
      throw new Error('Action must reference a prompt (prompt_id or prompt_builtin_id)');
    }

    // Build execution config with defaults
    const execution_config = {
      auto_run: false,
      allow_chat: true,
      show_variables: false,
      apply_variables: true,
      result_display: 'modal-full',
      track_in_runs: true,
      use_pre_execution_input: false,
      ...payload.execution_config,
    };

    const { data, error } = await supabase
      .from('prompt_actions')
      .insert({
        ...payload,
        user_id: userId,
        execution_config,
        broker_mappings: payload.broker_mappings || {},
        hardcoded_values: payload.hardcoded_values || {},
        context_scopes: payload.context_scopes || [],
        tags: payload.tags || [],
        is_public: payload.is_public || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create action:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to create action:', error);
    return null;
  }
}

/**
 * Update an existing action
 */
export async function updateAction(
  id: string,
  payload: UpdateActionPayload
): Promise<PromptAction | null> {
  try {
    // If execution_config is provided, merge with existing
    const updateData: any = { ...payload };

    const { data, error } = await supabase
      .from('prompt_actions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update action:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to update action:', error);
    return null;
  }
}

/**
 * Soft delete an action (set is_active = false)
 */
export async function deleteAction(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('prompt_actions')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Failed to delete action:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete action:', error);
    return false;
  }
}

/**
 * Hard delete an action (permanent)
 * Use with caution - this cannot be undone
 */
export async function permanentlyDeleteAction(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('prompt_actions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to permanently delete action:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to permanently delete action:', error);
    return false;
  }
}

/**
 * Duplicate an action
 */
export async function duplicateAction(
  id: string,
  userId: string,
  newName?: string
): Promise<PromptAction | null> {
  try {
    // Get original action
    const original = await getAction(id);
    if (!original) {
      throw new Error('Action not found');
    }

    // Create duplicate
    const payload: CreateActionPayload = {
      name: newName || `${original.name} (Copy)`,
      description: original.description || undefined,
      prompt_id: original.prompt_id || undefined,
      prompt_builtin_id: original.prompt_builtin_id || undefined,
      broker_mappings: original.broker_mappings,
      hardcoded_values: original.hardcoded_values,
      context_scopes: original.context_scopes,
      execution_config: original.execution_config,
      tags: original.tags,
      icon_name: original.icon_name || undefined,
      is_public: false, // Always private for copies
    };

    return await createAction(payload, userId);
  } catch (error) {
    console.error('Failed to duplicate action:', error);
    return null;
  }
}

/**
 * Search actions by name or description
 */
export async function searchActions(
  query: string,
  userId: string
): Promise<PromptAction[]> {
  try {
    const { data, error } = await supabase
      .from('prompt_actions')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .eq('is_active', true)
      .order('name')
      .limit(50);

    if (error) {
      console.error('Failed to search actions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to search actions:', error);
    return [];
  }
}

