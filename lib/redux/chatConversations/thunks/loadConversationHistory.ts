/**
 * loadConversationHistory thunk — loads existing conversation messages from backend
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { RootState, AppDispatch } from '../../store';
import { chatConversationsActions } from '../slice';
import { selectAccessToken } from '../../slices/userSlice';
import { BACKEND_URLS } from '@/lib/api/endpoints';
import { selectIsUsingLocalhost } from '../../slices/adminPreferencesSlice';
import { selectIsAdmin } from '../../slices/userSlice';
import type { ConversationMessage } from '../types';

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
    async ({ sessionId, conversationId, agentId }, { dispatch, getState }) => {
        const state = getState();
        const accessToken = selectAccessToken(state);
        const isLocalhost = selectIsUsingLocalhost(state);
        const isAdmin = selectIsAdmin(state);

        const backendUrl = isAdmin && isLocalhost ? BACKEND_URLS.localhost : BACKEND_URLS.production;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        dispatch(chatConversationsActions.setSessionStatus({ sessionId, status: 'initializing' }));

        try {
            const response = await fetch(`${backendUrl}/api/ai/conversations/${conversationId}/messages`, {
                headers,
            });

            if (!response.ok) {
                throw new Error(`Failed to load conversation: HTTP ${response.status}`);
            }

            const data = await response.json();
            const rawMessages: Array<{ role: string; content: string; id?: string; created_at?: string }> =
                data.messages ?? data ?? [];

            const messages: ConversationMessage[] = rawMessages.map(m => ({
                id: m.id ?? uuidv4(),
                role: (m.role as ConversationMessage['role']) ?? 'user',
                content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                status: 'complete' as const,
                timestamp: m.created_at ?? new Date().toISOString(),
            }));

            dispatch(chatConversationsActions.loadConversation({
                sessionId,
                conversationId,
                agentId,
                messages,
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
