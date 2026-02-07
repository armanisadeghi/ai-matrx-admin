'use server';

import { createClient } from '@/utils/supabase/server';
import {
    CreateFeedbackInput,
    UpdateFeedbackInput,
    UserFeedback,
    FeedbackStatus,
    CreateAnnouncementInput,
    UpdateAnnouncementInput,
    SystemAnnouncement,
} from '@/types/feedback.types';

// ============= USER FEEDBACK ACTIONS =============

/**
 * Submit user feedback
 */
export async function submitFeedback(input: CreateFeedbackInput): Promise<{ success: boolean; error?: string; data?: UserFeedback }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        // Get user metadata for username
        const username = user.user_metadata?.username || user.email || 'Anonymous';

        const { data, error } = await supabase
            .from('user_feedback')
            .insert({
                user_id: user.id,
                username,
                feedback_type: input.feedback_type,
                route: input.route,
                description: input.description,
                image_urls: input.image_urls || null,
                status: 'new',
            })
            .select()
            .single();

        if (error) {
            console.error('Error submitting feedback:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('Error in submitFeedback:', error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

/**
 * Get user's own feedback
 */
export async function getUserFeedback(): Promise<{ success: boolean; error?: string; data?: UserFeedback[] }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        const { data, error } = await supabase
            .from('user_feedback')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching user feedback:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error('Error in getUserFeedback:', error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

/**
 * Update user's own feedback (only allowed when status is 'new')
 */
export async function updateUserOwnFeedback(
    feedbackId: string,
    updates: { description?: string; feedback_type?: 'bug' | 'feature' | 'suggestion' | 'other' }
): Promise<{ success: boolean; error?: string; data?: UserFeedback }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        // First verify ownership and status
        const { data: existing, error: fetchError } = await supabase
            .from('user_feedback')
            .select('id, user_id, status')
            .eq('id', feedbackId)
            .single();

        if (fetchError || !existing) {
            return { success: false, error: 'Feedback item not found' };
        }

        if (existing.user_id !== user.id) {
            return { success: false, error: 'You can only edit your own feedback' };
        }

        if (existing.status !== 'new') {
            return { success: false, error: 'Can only edit feedback that hasn\'t been picked up yet' };
        }

        const { data, error } = await supabase
            .from('user_feedback')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', feedbackId)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating own feedback:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('Error in updateUserOwnFeedback:', error);
        return { success: false, error: message };
    }
}

// ============= ADMIN FEEDBACK ACTIONS =============

/**
 * Get all feedback (admin only)
 */
export async function getAllFeedback(): Promise<{ success: boolean; error?: string; data?: UserFeedback[] }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        const { data, error } = await supabase
            .from('user_feedback')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching all feedback:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error('Error in getAllFeedback:', error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

/**
 * Update feedback status (admin only)
 */
export async function updateFeedback(
    feedbackId: string,
    updates: UpdateFeedbackInput
): Promise<{ success: boolean; error?: string; data?: UserFeedback }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        const updateData: Record<string, unknown> = {
            ...updates,
            updated_at: new Date().toISOString(),
        };

        // If marking as resolved or closed, set resolved_at and resolved_by
        if (updates.status === 'resolved' || updates.status === 'closed') {
            updateData.resolved_at = new Date().toISOString();
            updateData.resolved_by = user.id;
        }

        // If user confirms (closed), set user_confirmed_at
        if (updates.status === 'closed') {
            updateData.user_confirmed_at = new Date().toISOString();
        }

        console.log('Updating feedback:', feedbackId, 'with data:', updateData);

        const { data, error } = await supabase
            .from('user_feedback')
            .update(updateData)
            .eq('id', feedbackId)
            .select()
            .single();

        if (error) {
            console.error('Error updating feedback:', error);
            return { success: false, error: error.message };
        }

        console.log('Feedback updated successfully:', data);
        return { success: true, data };
    } catch (error: any) {
        console.error('Error in updateFeedback:', error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

/**
 * Get feedback items by status (admin only)
 */
export async function getFeedbackByStatus(status: FeedbackStatus): Promise<{ success: boolean; error?: string; data?: UserFeedback[] }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        const { data, error } = await supabase
            .rpc('get_feedback_by_status', { p_status: status });

        if (error) {
            console.error('Error fetching feedback by status:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('Error in getFeedbackByStatus:', error);
        return { success: false, error: message };
    }
}

/**
 * Get feedback summary counts (admin only)
 */
export async function getFeedbackSummary(): Promise<{ success: boolean; error?: string; data?: Record<string, unknown> }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        const { data, error } = await supabase
            .rpc('get_feedback_summary');

        if (error) {
            console.error('Error fetching feedback summary:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('Error in getFeedbackSummary:', error);
        return { success: false, error: message };
    }
}

/**
 * User confirms a resolved feedback item (marks as closed)
 */
export async function confirmFeedbackResolution(feedbackId: string): Promise<{ success: boolean; error?: string; data?: UserFeedback }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        const { data, error } = await supabase
            .rpc('close_feedback_item', {
                p_id: feedbackId,
                p_status: 'closed',
                p_admin_notes: 'Confirmed by user',
            });

        if (error) {
            console.error('Error confirming feedback:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('Error in confirmFeedbackResolution:', error);
        return { success: false, error: message };
    }
}

// ============= ANNOUNCEMENT ACTIONS =============

/**
 * Get active announcements
 */
export async function getActiveAnnouncements(): Promise<{ success: boolean; error?: string; data?: SystemAnnouncement[] }> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('system_announcements')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching announcements:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error('Error in getActiveAnnouncements:', error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

/**
 * Get all announcements (admin only)
 */
export async function getAllAnnouncements(): Promise<{ success: boolean; error?: string; data?: SystemAnnouncement[] }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        const { data, error } = await supabase
            .from('system_announcements')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching all announcements:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error('Error in getAllAnnouncements:', error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

/**
 * Create announcement (admin only)
 */
export async function createAnnouncement(input: CreateAnnouncementInput): Promise<{ success: boolean; error?: string; data?: SystemAnnouncement }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        const { data, error } = await supabase
            .from('system_announcements')
            .insert({
                ...input,
                created_by: user.id,
                announcement_type: input.announcement_type || 'info',
                min_display_seconds: input.min_display_seconds || 3,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating announcement:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('Error in createAnnouncement:', error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

/**
 * Update announcement (admin only)
 */
export async function updateAnnouncement(
    announcementId: string,
    updates: UpdateAnnouncementInput
): Promise<{ success: boolean; error?: string; data?: SystemAnnouncement }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        const { data, error } = await supabase
            .from('system_announcements')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', announcementId)
            .select()
            .single();

        if (error) {
            console.error('Error updating announcement:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('Error in updateAnnouncement:', error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

/**
 * Delete announcement (admin only)
 */
export async function deleteAnnouncement(announcementId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        const { error } = await supabase
            .from('system_announcements')
            .delete()
            .eq('id', announcementId);

        if (error) {
            console.error('Error deleting announcement:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error in deleteAnnouncement:', error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

