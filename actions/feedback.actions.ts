'use server';

import { createClient } from '@/utils/supabase/server';
import {
    CreateFeedbackInput,
    UpdateFeedbackInput,
    UserFeedback,
    FeedbackStatus,
    FeedbackComment,
    FeedbackUserMessage,
    AdminDecision,
    TestingResult,
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

// ============= TRIAGE & WORKFLOW ACTIONS =============

/** Triage a feedback item (AI agent pushes analysis to DB) */
export async function triageFeedbackItem(
    feedbackId: string,
    triage: {
        ai_solution_proposal?: string;
        ai_suggested_priority?: string;
        ai_complexity?: string;
        ai_estimated_files?: string[];
        autonomy_score?: number;
        ai_assessment?: string;
    }
): Promise<{ success: boolean; error?: string; data?: UserFeedback }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc('triage_feedback_item', {
            p_id: feedbackId,
            p_ai_solution_proposal: triage.ai_solution_proposal || null,
            p_ai_suggested_priority: triage.ai_suggested_priority || null,
            p_ai_complexity: triage.ai_complexity || null,
            p_ai_estimated_files: triage.ai_estimated_files || null,
            p_autonomy_score: triage.autonomy_score || null,
            p_ai_assessment: triage.ai_assessment || null,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { success: false, error: message };
    }
}

/** Get the agent work queue (approved items in priority order) */
export async function getAgentWorkQueue(): Promise<{ success: boolean; error?: string; data?: UserFeedback[] }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc('get_agent_work_queue');
        if (error) return { success: false, error: error.message };
        return { success: true, data: data || [] };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { success: false, error: message };
    }
}

/** Get untriaged feedback items */
export async function getUntriagedFeedback(): Promise<{ success: boolean; error?: string; data?: UserFeedback[] }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc('get_untriaged_feedback');
        if (error) return { success: false, error: error.message };
        return { success: true, data: data || [] };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { success: false, error: message };
    }
}

/** Get a batch of untriaged items with pipeline context */
export async function getTriageBatch(batchSize: number = 3): Promise<{
    success: boolean;
    error?: string;
    data?: {
        batch: UserFeedback[];
        pipeline: {
            untriaged: number;
            your_decision: number;
            agent_working: number;
            test_results: number;
            done: number;
        };
        other_untriaged: {
            id: string;
            feedback_type: string;
            route: string;
            username: string | null;
            description_preview: string;
            has_images: boolean;
            has_admin_notes: boolean;
            created_at: string;
        }[];
    };
}> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc('get_triage_batch', {
            p_batch_size: batchSize,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { success: false, error: message };
    }
}

/** Set admin decision on a feedback item */
export async function setAdminDecision(
    feedbackId: string,
    decision: AdminDecision,
    direction?: string,
    workPriority?: number
): Promise<{ success: boolean; error?: string; data?: UserFeedback }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc('set_admin_decision', {
            p_id: feedbackId,
            p_decision: decision,
            p_direction: direction || null,
            p_work_priority: workPriority || null,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { success: false, error: message };
    }
}

/** Split a feedback item into sub-tasks */
export async function splitFeedbackItem(
    parentId: string,
    descriptions: string[]
): Promise<{ success: boolean; error?: string; data?: UserFeedback[] }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc('split_feedback_item', {
            p_parent_id: parentId, p_descriptions: descriptions,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, data: data || [] };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { success: false, error: message };
    }
}

/** Add a comment to a feedback item */
export async function addFeedbackComment(
    feedbackId: string,
    authorType: 'user' | 'admin' | 'ai_agent',
    content: string,
    authorName?: string
): Promise<{ success: boolean; error?: string; data?: FeedbackComment }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const name = authorName || user?.email || (authorType === 'ai_agent' ? 'AI Agent' : 'Unknown');
        const { data, error } = await supabase.rpc('add_feedback_comment', {
            p_feedback_id: feedbackId,
            p_author_type: authorType,
            p_author_name: name,
            p_content: content,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { success: false, error: message };
    }
}

/** Get all comments for a feedback item */
export async function getFeedbackComments(
    feedbackId: string
): Promise<{ success: boolean; error?: string; data?: FeedbackComment[] }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc('get_feedback_comments', {
            p_feedback_id: feedbackId,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, data: data || [] };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { success: false, error: message };
    }
}

/** Resolve a feedback item with testing instructions */
export async function resolveWithTesting(
    feedbackId: string,
    resolutionNotes: string,
    testingInstructions?: string,
    testingUrl?: string
): Promise<{ success: boolean; error?: string; data?: UserFeedback }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc('resolve_with_testing', {
            p_id: feedbackId,
            p_resolution_notes: resolutionNotes,
            p_testing_instructions: testingInstructions || null,
            p_testing_url: testingUrl || null,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { success: false, error: message };
    }
}

// ============= USER REVIEW MESSAGING ACTIONS =============

/** Admin sends a message to user for review (changes status to user_review) */
export async function sendUserReviewMessage(
    feedbackId: string,
    message: string,
    senderName?: string
): Promise<{ success: boolean; error?: string; data?: FeedbackUserMessage }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'User not authenticated' };

        const name = senderName || user.email || 'Admin';
        const { data, error } = await supabase.rpc('send_user_review_message', {
            p_feedback_id: feedbackId,
            p_message: message,
            p_sender_name: name,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, data };
    } catch (error: unknown) {
        const message2 = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { success: false, error: message2 };
    }
}

/** Admin replies to a user in an ongoing user review thread */
export async function adminReplyUserReview(
    feedbackId: string,
    message: string,
    senderName?: string
): Promise<{ success: boolean; error?: string; data?: FeedbackUserMessage }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'User not authenticated' };

        const name = senderName || user.email || 'Admin';
        const { data, error } = await supabase.rpc('admin_reply_user_review', {
            p_feedback_id: feedbackId,
            p_message: message,
            p_sender_name: name,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, data };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { success: false, error: msg };
    }
}

/** User replies to admin's review request (changes status back to awaiting_review) */
export async function replyToUserReview(
    feedbackId: string,
    message: string,
    senderName?: string
): Promise<{ success: boolean; error?: string; data?: FeedbackUserMessage }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'User not authenticated' };

        const name = senderName || user.user_metadata?.username || user.email || 'User';
        const { data, error } = await supabase.rpc('reply_to_user_review', {
            p_feedback_id: feedbackId,
            p_message: message,
            p_sender_name: name,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, data };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { success: false, error: msg };
    }
}

/** Get all user review messages for a feedback item */
export async function getUserMessages(
    feedbackId: string
): Promise<{ success: boolean; error?: string; data?: FeedbackUserMessage[] }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc('get_user_messages', {
            p_feedback_id: feedbackId,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, data: data || [] };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { success: false, error: msg };
    }
}

/** Mark a user message as emailed */
export async function markUserMessageEmailed(
    messageId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();
        const { error } = await supabase.rpc('mark_user_message_emailed', {
            p_message_id: messageId,
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { success: false, error: msg };
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

        return { success: true, data };
    } catch (error: any) {
        console.error('Error in updateFeedback:', error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

/**
 * Fetch a single feedback item by ID (admin only)
 */
export async function getFeedbackById(
    feedbackId: string
): Promise<{ success: boolean; error?: string; data?: UserFeedback }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'User not authenticated' };

        const { data, error } = await supabase
            .from('user_feedback')
            .select('*')
            .eq('id', feedbackId)
            .single();

        if (error) return { success: false, error: error.message };
        return { success: true, data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { success: false, error: message };
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

