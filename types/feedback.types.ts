// Types for user feedback and bug reporting system

export type FeedbackType = 'bug' | 'feature' | 'suggestion' | 'other';
export type FeedbackStatus = 'new' | 'in_review' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';

export interface UserFeedback {
    id: string;
    user_id: string;
    username: string | null;
    feedback_type: FeedbackType;
    route: string;
    description: string;
    status: FeedbackStatus;
    admin_notes: string | null;
    image_urls: string[] | null;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
    resolved_by: string | null;
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
    admin_notes?: string;
    resolved_by?: string;
}

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

