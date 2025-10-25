'use server';

import { createClient } from '@/utils/supabase/server';
import {
    CreateFeedbackInput,
    UpdateFeedbackInput,
    UserFeedback,
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

        const updateData: any = {
            ...updates,
            updated_at: new Date().toISOString(),
        };

        // If marking as resolved, set resolved_at and resolved_by
        if (updates.status === 'resolved' || updates.status === 'closed') {
            updateData.resolved_at = new Date().toISOString();
            updateData.resolved_by = user.id;
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

