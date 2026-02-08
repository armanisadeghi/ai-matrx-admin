// Types for user feedback and bug reporting system

export type FeedbackType = 'bug' | 'feature' | 'suggestion' | 'other';
export type FeedbackStatus = 'new' | 'triaged' | 'in_progress' | 'awaiting_review' | 'user_review' | 'resolved' | 'closed' | 'wont_fix' | 'split' | 'deferred';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';
export type AdminDecision = 'pending' | 'approved' | 'rejected' | 'deferred' | 'split';
export type AiComplexity = 'simple' | 'moderate' | 'complex';
export type TestingResult = 'pending' | 'pass' | 'fail' | 'partial';

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
    // Parent-child for split issues
    parent_id: string | null;
    // AI triage fields
    ai_solution_proposal: string | null;
    ai_suggested_priority: string | null;
    ai_complexity: AiComplexity | null;
    ai_estimated_files: string[] | null;
    // Admin decision fields
    admin_direction: string | null;
    admin_decision: AdminDecision;
    work_priority: number | null;
    // Testing fields
    testing_instructions: string | null;
    testing_url: string | null;
    testing_result: TestingResult | null;
}

export interface FeedbackComment {
    id: string;
    feedback_id: string;
    author_type: 'user' | 'admin' | 'ai_agent';
    author_name: string | null;
    content: string;
    created_at: string;
}

/** Messages between admin and user (separate from internal comments) */
export interface FeedbackUserMessage {
    id: string;
    feedback_id: string;
    sender_type: 'admin' | 'user';
    sender_name: string | null;
    content: string;
    created_at: string;
    email_sent: boolean;
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
    resolved_at?: string | null;
    resolved_by?: string | null;
    admin_direction?: string;
    admin_decision?: AdminDecision;
    work_priority?: number;
    testing_instructions?: string;
    testing_url?: string;
    testing_result?: TestingResult;
}

/** Human-readable status labels for the user portal */
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
    new: 'Submitted',
    triaged: 'Under Review',
    in_progress: 'In Progress',
    awaiting_review: 'Fix Ready',
    user_review: 'Your Review Needed',
    resolved: 'Verified',
    closed: 'Closed',
    wont_fix: 'Won\'t Fix',
    split: 'Split',
    deferred: 'Deferred',
};

/** Pipeline-aligned status labels for the admin UI */
export const ADMIN_STATUS_LABELS: Record<FeedbackStatus, string> = {
    new: 'New',
    triaged: 'Triaged',
    in_progress: 'In Progress',
    awaiting_review: 'Ready for Testing',
    user_review: 'User Review',
    resolved: 'Verified',
    closed: 'Closed',
    wont_fix: 'Won\'t Fix',
    split: 'Split',
    deferred: 'Deferred',
};

/** Status badge color mappings (Tailwind classes) */
export const FEEDBACK_STATUS_COLORS: Record<FeedbackStatus, { bg: string; text: string }> = {
    new: { bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400' },
    triaged: { bg: 'bg-indigo-500/15', text: 'text-indigo-700 dark:text-indigo-400' },
    in_progress: { bg: 'bg-yellow-500/15', text: 'text-yellow-700 dark:text-yellow-400' },
    awaiting_review: { bg: 'bg-orange-500/15', text: 'text-orange-700 dark:text-orange-400' },
    user_review: { bg: 'bg-cyan-500/15', text: 'text-cyan-700 dark:text-cyan-400' },
    resolved: { bg: 'bg-green-500/15', text: 'text-green-700 dark:text-green-400' },
    closed: { bg: 'bg-muted', text: 'text-muted-foreground' },
    wont_fix: { bg: 'bg-red-500/15', text: 'text-red-700 dark:text-red-400' },
    split: { bg: 'bg-purple-500/15', text: 'text-purple-700 dark:text-purple-400' },
    deferred: { bg: 'bg-gray-500/15', text: 'text-gray-700 dark:text-gray-400' },
};

/** Admin decision labels and colors */
export const ADMIN_DECISION_LABELS: Record<AdminDecision, string> = {
    pending: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    deferred: 'Deferred',
    split: 'Split',
};

export const ADMIN_DECISION_COLORS: Record<AdminDecision, { bg: string; text: string }> = {
    pending: { bg: 'bg-gray-500/15', text: 'text-gray-700 dark:text-gray-400' },
    approved: { bg: 'bg-green-500/15', text: 'text-green-700 dark:text-green-400' },
    rejected: { bg: 'bg-red-500/15', text: 'text-red-700 dark:text-red-400' },
    deferred: { bg: 'bg-yellow-500/15', text: 'text-yellow-700 dark:text-yellow-400' },
    split: { bg: 'bg-purple-500/15', text: 'text-purple-700 dark:text-purple-400' },
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
