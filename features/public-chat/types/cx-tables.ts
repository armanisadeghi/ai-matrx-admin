/**
 * cx_ Database Table Types
 *
 * These types represent the cx_ prefixed tables in Supabase for the public agent chat system.
 * Tables: cx_request, cx_message, cx_media, cx_user_request
 *
 * NOTE: These types are based on inferred schemas from the table names.
 * If column names don't match the actual database, update the field names here
 * and all service/component code will follow (single source of truth).
 */

// ============================================================================
// cx_request - A chat request/conversation session
// ============================================================================

export interface CxRequest {
    id: string;                         // uuid PK
    user_id: string | null;             // FK to auth.users (null for guests)
    fingerprint_id: string | null;      // Guest fingerprint identifier
    prompt_id: string | null;           // FK to prompts table (agent used)
    conversation_id: string;            // UUID used in agent API calls
    label: string | null;               // Auto-generated or user-set title
    status: CxRequestStatus;
    metadata: Record<string, unknown> | null;
    created_at: string;                 // timestamptz
    updated_at: string;                 // timestamptz
}

export type CxRequestStatus = 'active' | 'completed' | 'error' | 'archived';

export interface CxRequestInsert {
    id?: string;
    user_id?: string | null;
    fingerprint_id?: string | null;
    prompt_id?: string | null;
    conversation_id: string;
    label?: string | null;
    status?: CxRequestStatus;
    metadata?: Record<string, unknown> | null;
}

export interface CxRequestUpdate {
    label?: string | null;
    status?: CxRequestStatus;
    metadata?: Record<string, unknown> | null;
    updated_at?: string;
}

// ============================================================================
// cx_message - Individual messages within a request
// ============================================================================

export interface CxMessage {
    id: string;                         // uuid PK
    request_id: string;                 // FK to cx_request
    role: CxMessageRole;
    content: string;
    status: CxMessageStatus;
    display_order: number;
    metadata: Record<string, unknown> | null;
    created_at: string;                 // timestamptz
}

export type CxMessageRole = 'user' | 'assistant' | 'system';
export type CxMessageStatus = 'pending' | 'sending' | 'streaming' | 'complete' | 'error';

export interface CxMessageInsert {
    id?: string;
    request_id: string;
    role: CxMessageRole;
    content: string;
    status?: CxMessageStatus;
    display_order?: number;
    metadata?: Record<string, unknown> | null;
}

// ============================================================================
// cx_media - Media attachments on messages
// ============================================================================

export interface CxMedia {
    id: string;                         // uuid PK
    message_id: string;                 // FK to cx_message
    url: string;
    type: CxMediaType;
    filename: string | null;
    mime_type: string | null;
    size: number | null;
    metadata: Record<string, unknown> | null;
    created_at: string;                 // timestamptz
}

export type CxMediaType = 'image' | 'file' | 'audio' | 'video' | 'youtube' | 'webpage';

export interface CxMediaInsert {
    id?: string;
    message_id: string;
    url: string;
    type: CxMediaType;
    filename?: string | null;
    mime_type?: string | null;
    size?: number | null;
    metadata?: Record<string, unknown> | null;
}

// ============================================================================
// cx_user_request - Links users/guests to their request history
// ============================================================================

export interface CxUserRequest {
    id: string;                         // uuid PK
    user_id: string | null;             // FK to auth.users
    fingerprint_id: string | null;      // Guest fingerprint
    request_id: string;                 // FK to cx_request
    created_at: string;                 // timestamptz
}

export interface CxUserRequestInsert {
    id?: string;
    user_id?: string | null;
    fingerprint_id?: string | null;
    request_id: string;
}

// ============================================================================
// Composite / View Types (for UI convenience)
// ============================================================================

/** A request with its message count, used in sidebar history */
export interface CxRequestSummary {
    id: string;
    conversation_id: string;
    label: string | null;
    prompt_id: string | null;
    status: CxRequestStatus;
    created_at: string;
    updated_at: string;
    message_count?: number;
}

/** A full request with all its messages, used when loading a conversation */
export interface CxRequestWithMessages {
    request: CxRequest;
    messages: CxMessage[];
    media: CxMedia[];
}
