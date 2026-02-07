// Types for user feedback and bug reporting system

export type FeedbackType = 'bug' | 'feature' | 'suggestion' | 'other';
export type FeedbackStatus = 'new' | 'in_progress' | 'awaiting_review' | 'resolved' | 'closed' | 'wont_fix';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

export interface UserFeedback {
    id: string;
    user_id: string;
    username: string | null;
    feedback_type: FeedbackType;
    route: string;
    description: string;
    status: FeedbackStatus;
    priority: FeedbackPriority;
    admin_notes: string | null;
    ai_assessment: string | null;
    autonomy_score: number | null;
    resolution_notes: string | null;
    image_urls: string[] | null;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
    resolved_by: string | null;
    user_confirmed_at: string | null;
}

export interface CreateFeedbackInput {
    feedback_type: FeedbackType;
    route: string;
    description: string;
    image_urls?: string[];
}

export interface UpdateFeedbackInput {
    description?: string;
    feedback_type?: FeedbackType;
    route?: string;
    status?: FeedbackStatus;
    priority?: FeedbackPriority;
    admin_notes?: string;
    ai_assessment?: string;
    autonomy_score?: number;
    resolution_notes?: string;
    resolved_by?: string;
}

/** Human-readable status labels for the user portal */
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
    new: 'Submitted',
    in_progress: 'In Progress',
    awaiting_review: 'Fix Ready - Under Review',
    resolved: 'Resolved',
    closed: 'Closed',
    wont_fix: 'Won\'t Fix',
};

/** Status badge color mappings (Tailwind classes) */
export const FEEDBACK_STATUS_COLORS: Record<FeedbackStatus, { bg: string; text: string }> = {
    new: { bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400' },
    in_progress: { bg: 'bg-yellow-500/15', text: 'text-yellow-700 dark:text-yellow-400' },
    awaiting_review: { bg: 'bg-orange-500/15', text: 'text-orange-700 dark:text-orange-400' },
    resolved: { bg: 'bg-green-500/15', text: 'text-green-700 dark:text-green-400' },
    closed: { bg: 'bg-muted', text: 'text-muted-foreground' },
    wont_fix: { bg: 'bg-red-500/15', text: 'text-red-700 dark:text-red-400' },
};

export type AnnouncementType = 'info' | 'warning' | 'critical' | 'update';

export interface SystemAnnouncement {
    id: string;
    title: string;
    message: string;
    announcement_type: AnnouncementType;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    min_display_seconds: number;
}

export interface CreateAnnouncementInput {
    title: string;
    message: string;
    announcement_type?: AnnouncementType;
    min_display_seconds?: number;
}

export interface UpdateAnnouncementInput {
    title?: string;
    message?: string;
    announcement_type?: AnnouncementType;
    is_active?: boolean;
    min_display_seconds?: number;
}

