/**
 * cx-chat service - Server-side Supabase queries for cx_ tables.
 *
 * Used by: Server Components, Route Handlers, Server Actions.
 * Client components should call these through API routes or server actions.
 */

import { createClient } from '@/utils/supabase/server';
import type {
    CxRequest,
    CxRequestInsert,
    CxRequestUpdate,
    CxRequestSummary,
    CxMessage,
    CxMessageInsert,
    CxMedia,
    CxMediaInsert,
    CxUserRequest,
    CxUserRequestInsert,
    CxRequestWithMessages,
} from '../types/cx-tables';

// ============================================================================
// cx_request queries
// ============================================================================

/** Get a single request by ID */
export async function getCxRequest(requestId: string): Promise<CxRequest | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('cx_request')
        .select('*')
        .eq('id', requestId)
        .single();

    if (error) {
        console.error('getCxRequest error:', error);
        return null;
    }
    return data as CxRequest;
}

/** Get a request by conversation_id (the UUID used in agent API) */
export async function getCxRequestByConversationId(conversationId: string): Promise<CxRequest | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('cx_request')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') console.error('getCxRequestByConversationId error:', error);
        return null;
    }
    return data as CxRequest;
}

/** Create a new request */
export async function createCxRequest(request: CxRequestInsert): Promise<CxRequest | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('cx_request')
        .insert(request)
        .select()
        .single();

    if (error) {
        console.error('createCxRequest error:', error);
        return null;
    }
    return data as CxRequest;
}

/** Update a request (e.g., rename, change status) */
export async function updateCxRequest(requestId: string, updates: CxRequestUpdate): Promise<CxRequest | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('cx_request')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .select()
        .single();

    if (error) {
        console.error('updateCxRequest error:', error);
        return null;
    }
    return data as CxRequest;
}

/** Delete a request and its messages/media (cascade should handle related rows) */
export async function deleteCxRequest(requestId: string): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('cx_request')
        .delete()
        .eq('id', requestId);

    if (error) {
        console.error('deleteCxRequest error:', error);
        return false;
    }
    return true;
}

// ============================================================================
// Chat history queries (for sidebar)
// ============================================================================

/** Get request history for an authenticated user */
export async function getUserChatHistory(
    userId: string,
    limit = 50,
    offset = 0
): Promise<CxRequestSummary[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('cx_request')
        .select('id, conversation_id, label, prompt_id, status, created_at, updated_at')
        .eq('user_id', userId)
        .neq('status', 'archived')
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('getUserChatHistory error:', error);
        return [];
    }
    return (data || []) as CxRequestSummary[];
}

/** Get request history for a guest user via fingerprint */
export async function getGuestChatHistory(
    fingerprintId: string,
    limit = 50,
    offset = 0
): Promise<CxRequestSummary[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('cx_request')
        .select('id, conversation_id, label, prompt_id, status, created_at, updated_at')
        .eq('fingerprint_id', fingerprintId)
        .is('user_id', null)
        .neq('status', 'archived')
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('getGuestChatHistory error:', error);
        return [];
    }
    return (data || []) as CxRequestSummary[];
}

// ============================================================================
// cx_message queries
// ============================================================================

/** Get all messages for a request, ordered by display_order */
export async function getCxMessages(requestId: string): Promise<CxMessage[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('cx_message')
        .select('*')
        .eq('request_id', requestId)
        .order('display_order', { ascending: true });

    if (error) {
        console.error('getCxMessages error:', error);
        return [];
    }
    return (data || []) as CxMessage[];
}

/** Create a message */
export async function createCxMessage(message: CxMessageInsert): Promise<CxMessage | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('cx_message')
        .insert(message)
        .select()
        .single();

    if (error) {
        console.error('createCxMessage error:', error);
        return null;
    }
    return data as CxMessage;
}

/** Bulk insert messages (e.g., when saving a complete conversation) */
export async function bulkCreateCxMessages(messages: CxMessageInsert[]): Promise<CxMessage[]> {
    if (messages.length === 0) return [];
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('cx_message')
        .insert(messages)
        .select();

    if (error) {
        console.error('bulkCreateCxMessages error:', error);
        return [];
    }
    return (data || []) as CxMessage[];
}

// ============================================================================
// cx_media queries
// ============================================================================

/** Get media for specific messages */
export async function getCxMediaForMessages(messageIds: string[]): Promise<CxMedia[]> {
    if (messageIds.length === 0) return [];
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('cx_media')
        .select('*')
        .in('message_id', messageIds)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('getCxMediaForMessages error:', error);
        return [];
    }
    return (data || []) as CxMedia[];
}

/** Create a media attachment */
export async function createCxMedia(media: CxMediaInsert): Promise<CxMedia | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('cx_media')
        .insert(media)
        .select()
        .single();

    if (error) {
        console.error('createCxMedia error:', error);
        return null;
    }
    return data as CxMedia;
}

// ============================================================================
// cx_user_request queries
// ============================================================================

/** Link a user/guest to a request */
export async function createCxUserRequest(link: CxUserRequestInsert): Promise<CxUserRequest | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('cx_user_request')
        .insert(link)
        .select()
        .single();

    if (error) {
        console.error('createCxUserRequest error:', error);
        return null;
    }
    return data as CxUserRequest;
}

// ============================================================================
// Composite queries
// ============================================================================

/** Load a full conversation with all messages and media */
export async function loadFullConversation(requestId: string): Promise<CxRequestWithMessages | null> {
    const request = await getCxRequest(requestId);
    if (!request) return null;

    const messages = await getCxMessages(requestId);
    const messageIds = messages.map(m => m.id);
    const media = await getCxMediaForMessages(messageIds);

    return { request, messages, media };
}
