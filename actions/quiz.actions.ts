'use server';

import { createClient } from '@/utils/supabase/server';
import type { QuizState } from '@/components/mardown-display/blocks/quiz/quiz-types';

export type QuizSession = {
  id: string;
  user_id: string;
  title: string | null;
  category: string | null;
  state: QuizState;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  quiz_content_hash: string | null;
  quiz_metadata: Record<string, any> | null;
};

/**
 * Check if a quiz with the same content hash already exists
 */
export async function findExistingQuizByHash(
  contentHash: string
): Promise<{ success: boolean; data?: QuizSession; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('quiz_content_hash', contentHash)
      .eq('is_completed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error finding existing quiz:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || undefined };
  } catch (error) {
    console.error('Error in findExistingQuizByHash:', error);
    return { success: false, error: 'Failed to find existing quiz' };
  }
}

/**
 * Create a new quiz session in the database (without duplicate check)
 * Use findExistingQuizByHash BEFORE calling this if you want duplicate detection
 * 
 * @param metadata - Additional custom metadata (not for title/category - those have dedicated columns)
 */
export async function createQuizSession(
  state: QuizState,
  title?: string,
  category?: string,
  contentHash?: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; data?: QuizSession; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert({
        user_id: user.id,
        title: title || null,
        category: category || null,
        state,
        is_completed: false,
        quiz_content_hash: contentHash || null,
        quiz_metadata: metadata || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quiz session:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in createQuizSession:', error);
    return { success: false, error: 'Failed to create quiz session' };
  }
}

/**
 * Update an existing quiz session
 */
export async function updateQuizSession(
  id: string,
  state: QuizState,
  isCompleted?: boolean
): Promise<{ success: boolean; data?: QuizSession; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const updateData: any = {
      state,
      is_completed: isCompleted ?? state.results !== null
    };

    // Set completed_at if quiz is being completed
    if (updateData.is_completed && state.results) {
      updateData.completed_at = new Date(state.results.completedAt).toISOString();
    }

    const { data, error } = await supabase
      .from('quiz_sessions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating quiz session:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in updateQuizSession:', error);
    return { success: false, error: 'Failed to update quiz session' };
  }
}

/**
 * Get a quiz session by ID
 */
export async function getQuizSession(
  id: string
): Promise<{ success: boolean; data?: QuizSession; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching quiz session:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getQuizSession:', error);
    return { success: false, error: 'Failed to fetch quiz session' };
  }
}

/**
 * Get all quiz sessions for the current user
 */
export async function getUserQuizSessions(
  options?: {
    completedOnly?: boolean;
    inProgressOnly?: boolean;
    limit?: number;
  }
): Promise<{ success: boolean; data?: QuizSession[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    let query = supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (options?.completedOnly) {
      query = query.eq('is_completed', true);
    } else if (options?.inProgressOnly) {
      query = query.eq('is_completed', false);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching quiz sessions:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getUserQuizSessions:', error);
    return { success: false, error: 'Failed to fetch quiz sessions' };
  }
}

/**
 * Delete a quiz session
 */
export async function deleteQuizSession(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('quiz_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting quiz session:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteQuizSession:', error);
    return { success: false, error: 'Failed to delete quiz session' };
  }
}

/**
 * Update quiz session title
 */
export async function updateQuizTitle(
  id: string,
  title: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('quiz_sessions')
      .update({ title })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating quiz title:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateQuizTitle:', error);
    return { success: false, error: 'Failed to update quiz title' };
  }
}

