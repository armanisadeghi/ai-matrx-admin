/**
 * loadConversationHistory thunk — loads existing conversation messages from backend
 *
 * Uses the cx-chat API endpoint (same as p/chat) which reads from Supabase
 * cx_conversation/cx_message tables, then processes through processDbMessagesForDisplay
 * to properly handle content blocks, tool calls, thinking, and condensed messages.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '@/lib/redux/store';
import { chatConversationsActions } from '../slice';
import type { ConversationMessage } from '../types';
import { processDbMessagesForDisplay } from '@/features/public-chat/utils/cx-content-converter';
import type { CxConversationWithMessages, CxToolCall, CxContentHistoryEntry } from '@/features/public-chat/types/cx-tables';

interface LoadConversationPayload {
    sessionId: string;
    conversationId: string;
    agentId: string;
}

export const loadConversationHistory = createAsyncThunk<
    void,
    LoadConversationPayload,
    { dispatch: AppDispatch; state: RootState }
>(
    'chatConversations/loadConversationHistory',
    async ({ sessionId, conversationId, agentId }, { dispatch }) => {
        dispatch(chatConversationsActions.setSessionStatus({ sessionId, status: 'initializing' }));

        try {
            // Use the same API endpoint that works in p/chat
            const url = `/api/cx-chat/request?id=${conversationId}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to load conversation: HTTP ${response.status}`);
            }

            const json = await response.json();

            if (!json.success || !json.data) {
                throw new Error(json.error || 'Conversation not found');
            }

            const data: CxConversationWithMessages = json.data;

            // Process DB messages through the same pipeline as p/chat
            // This handles content blocks, tool calls, thinking, condensed messages, etc.
            const processedMessages = processDbMessagesForDisplay(data.messages, data.toolCalls);

            // Build toolCallsById for O(1) lookup at session level
            const toolCallsById: Record<string, CxToolCall> = {};
            if (data.toolCalls) {
                for (const tc of data.toolCalls) {
                    toolCallsById[tc.call_id] = tc;
                }
            }

            // Convert ProcessedChatMessage[] to ConversationMessage[]
            const messages: ConversationMessage[] = processedMessages.map(msg => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                status: 'complete' as const,
                timestamp: msg.timestamp instanceof Date
                    ? msg.timestamp.toISOString()
                    : new Date(msg.timestamp).toISOString(),
                // Preserve all raw DB data
                rawContent: msg.rawContent,
                originalDisplayContent: msg.content,
                dbRole: msg.dbRole,
                dbStatus: msg.dbStatus,
                conversationId: msg.conversationId,
                position: msg.position,
                dbMetadata: msg.dbMetadata,
                contentHistory: (Array.isArray(msg.contentHistory) ? msg.contentHistory : null) as CxContentHistoryEntry[] | null,
                createdAt: msg.createdAt,
                deletedAt: msg.deletedAt,
                // Derived
                toolUpdates: msg.toolUpdates?.length > 0 ? msg.toolUpdates : undefined,
                rawToolCalls: msg.rawToolCalls?.length > 0 ? msg.rawToolCalls : undefined,
                isCondensed: msg.isCondensed || undefined,
            }));

            dispatch(chatConversationsActions.loadConversation({
                sessionId,
                conversationId,
                agentId,
                messages,
                toolCallsById,
            }));

        } catch (error: unknown) {
            const err = error as Error;
            dispatch(chatConversationsActions.setSessionStatus({
                sessionId,
                status: 'error',
                error: err.message || 'Failed to load conversation',
            }));
        }
    }
);
