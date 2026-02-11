/**
 * cx_ Database Table Types
 *
 * Types for the cx_ prefixed tables in Supabase powering the public chat system.
 * These match the ACTUAL database schema exactly.
 *
 * Tables used by chat UI:
 *   cx_conversation - Chat sessions (title, status, message_count)
 *   cx_message      - Messages within a conversation (role, content as jsonb, position)
 *   cx_media        - Media attachments linked to a conversation
 *
 * Tables NOT used by chat UI (analytics/telemetry):
 *   cx_request       - Individual API call metrics (tokens, cost, duration)
 *   cx_user_request  - Aggregated user request metrics
 */

// ============================================================================
// cx_conversation - A chat session
// ============================================================================

export interface CxConversation {
    id: string;                                 // uuid PK, gen_random_uuid()
    user_id: string;                            // uuid NOT NULL, FK to auth.users
    title: string | null;                       // text, user-facing label
    system_instruction: string | null;          // text, system prompt
    config: Record<string, unknown>;            // jsonb NOT NULL, default '{}'
    status: CxConversationStatus;               // text NOT NULL, default 'active'
    message_count: number;                      // smallint NOT NULL, default 0
    forked_from_id: string | null;              // uuid, FK to cx_conversation
    forked_at_position: number | null;          // smallint
    created_at: string;                         // timestamptz NOT NULL
    updated_at: string;                         // timestamptz NOT NULL
    deleted_at: string | null;                  // timestamptz
    metadata: Record<string, unknown>;          // jsonb NOT NULL, default '{}'
    ai_model_id: string | null;                 // uuid
}

export type CxConversationStatus = 'active' | 'completed' | 'archived';

export interface CxConversationInsert {
    id?: string;
    user_id: string;
    title?: string | null;
    system_instruction?: string | null;
    config?: Record<string, unknown>;
    status?: CxConversationStatus;
    ai_model_id?: string | null;
    metadata?: Record<string, unknown>;
}

export interface CxConversationUpdate {
    title?: string | null;
    status?: CxConversationStatus;
    system_instruction?: string | null;
    config?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    updated_at?: string;
}

// ============================================================================
// cx_message - Individual messages within a conversation
// ============================================================================

export interface CxMessage {
    id: string;                                 // uuid PK
    conversation_id: string;                    // uuid NOT NULL, FK to cx_conversation
    role: CxMessageRole;                        // text NOT NULL
    position: number;                           // smallint NOT NULL
    status: CxMessageDbStatus;                  // text NOT NULL, default 'active'
    content: CxContentBlock[];                  // jsonb NOT NULL, default '[]' — array of content parts
    created_at: string;                         // timestamptz NOT NULL
    deleted_at: string | null;                  // timestamptz
    metadata: Record<string, unknown>;          // jsonb NOT NULL, default '{}'
}

export type CxMessageRole = 'user' | 'assistant' | 'system' | 'tool';

/** DB status — NOT the same as UI streaming status */
export type CxMessageDbStatus = 'active' | 'condensed' | 'summary' | 'deleted';

// ============================================================================
// Content block types (cx_message.content jsonb array elements)
// ============================================================================

/** Plain text content — the main display body */
export interface CxTextContent {
    type: 'text';
    text: string;
    id?: string;
    citations?: unknown[];
}

/** AI thinking/reasoning — collapsible section */
export interface CxThinkingContent {
    type: 'thinking';
    text: string; // Often empty for some providers
    provider?: string;
    signature?: string; // Internal provider data — never display
    signature_encoding?: string;
    summary?: string[];
}

/** Media attachments — images, audio, video, documents */
export interface CxMediaContent {
    type: 'media';
    kind: 'image' | 'audio' | 'video' | 'document';
    url: string;
    mime_type?: string;
    file_uri?: string;
    metadata?: Record<string, unknown>;
}

/** Tool call — AI requests a tool (assistant messages) */
export interface CxToolCallContent {
    type: 'tool_call';
    tool_call_id: string;
    name: string;
    arguments: string; // JSON string — parse for display
}

/** Tool result — response from a tool (tool-role messages) */
export interface CxToolResultContent {
    type: 'tool_result';
    tool_call_id: string;
    name: string;
    content: string; // JSON string — parse for display
    is_error: boolean;
}

/** Union of all content block types stored in cx_message.content */
export type CxContentBlock =
    | CxTextContent
    | CxThinkingContent
    | CxMediaContent
    | CxToolCallContent
    | CxToolResultContent;

/**
 * @deprecated Use CxContentBlock instead. Kept for backward compatibility.
 * Content is stored as a jsonb array of parts.
 */
export interface CxMessageContent {
    type: string;
    text?: string;
    url?: string;
    language?: string;
    [key: string]: unknown;
}

export interface CxMessageInsert {
    id?: string;
    conversation_id: string;
    role: CxMessageRole;
    position: number;
    status?: CxMessageDbStatus;
    content: CxContentBlock[];
    metadata?: Record<string, unknown>;
}

// ============================================================================
// cx_media - Media attachments on a conversation
// ============================================================================

export interface CxMedia {
    id: string;                                 // uuid PK
    conversation_id: string | null;             // uuid, FK to cx_conversation
    user_id: string;                            // uuid NOT NULL
    kind: CxMediaKind;                          // text NOT NULL
    url: string;                                // text NOT NULL
    file_uri: string | null;                    // text
    mime_type: string | null;                   // text
    file_size_bytes: number | null;             // bigint
    created_at: string;                         // timestamptz NOT NULL
    deleted_at: string | null;                  // timestamptz
    metadata: Record<string, unknown>;          // jsonb NOT NULL, default '{}'
}

export type CxMediaKind = 'image' | 'file' | 'audio' | 'video' | 'youtube' | 'webpage';

export interface CxMediaInsert {
    id?: string;
    conversation_id?: string | null;
    user_id: string;
    kind: CxMediaKind;
    url: string;
    file_uri?: string | null;
    mime_type?: string | null;
    file_size_bytes?: number | null;
    metadata?: Record<string, unknown>;
}

// ============================================================================
// Composite / View Types (for UI convenience)
// ============================================================================

/** A conversation summary for the sidebar history list */
export interface CxConversationSummary {
    id: string;
    title: string | null;
    status: CxConversationStatus;
    message_count: number;
    created_at: string;
    updated_at: string;
}

/** A shared conversation summary for the sidebar "Shared with Me" section */
export interface SharedCxConversationSummary extends CxConversationSummary {
    permission_level: 'viewer' | 'editor' | 'admin';
    owner_email: string | null;
}

/** A full conversation with all its messages, used when loading a chat */
export interface CxConversationWithMessages {
    conversation: CxConversation;
    messages: CxMessage[];
}
