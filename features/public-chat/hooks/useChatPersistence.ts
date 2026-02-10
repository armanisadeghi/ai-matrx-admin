'use client';

import { useCallback, useRef } from 'react';
import { useApiAuth } from '@/hooks/useApiAuth';
import type { CxRequestSummary, CxRequestWithMessages, CxMessageInsert } from '../types/cx-tables';
import type { ChatMessage } from '../context/ChatContext';

/**
 * Client-side hook for persisting chat data to cx_ tables via API routes.
 *
 * Handles: creating requests, saving messages, loading history, rename, delete.
 */
export function useChatPersistence() {
    const { accessToken, fingerprintId, isAuthenticated } = useApiAuth();
    const pendingRequestId = useRef<string | null>(null);

    /** Create a new cx_request in the database */
    const createRequest = useCallback(async (params: {
        conversationId: string;
        promptId?: string;
        label?: string;
    }): Promise<string | null> => {
        try {
            const res = await fetch('/api/cx-chat/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversation_id: params.conversationId,
                    prompt_id: params.promptId,
                    label: params.label,
                    fingerprint_id: !isAuthenticated ? fingerprintId : undefined,
                }),
            });
            const json = await res.json();
            if (json.success && json.data?.id) {
                pendingRequestId.current = json.data.id;
                return json.data.id;
            }
            return null;
        } catch (error) {
            console.error('createRequest error:', error);
            return null;
        }
    }, [isAuthenticated, fingerprintId]);

    /** Save messages to the database for a given request */
    const saveMessages = useCallback(async (
        requestId: string,
        messages: ChatMessage[]
    ): Promise<boolean> => {
        try {
            const cxMessages: CxMessageInsert[] = messages.map((msg, index) => ({
                request_id: requestId,
                role: msg.role,
                content: msg.content,
                status: msg.status === 'complete' ? 'complete' : msg.status,
                display_order: index,
                metadata: {
                    ...(msg.variables ? { variables: msg.variables } : {}),
                    ...(msg.resources ? { resources: msg.resources } : {}),
                },
            }));

            const res = await fetch('/api/cx-chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: cxMessages }),
            });
            const json = await res.json();
            return json.success;
        } catch (error) {
            console.error('saveMessages error:', error);
            return false;
        }
    }, []);

    /** Load chat history (sidebar) */
    const loadHistory = useCallback(async (
        limit = 50,
        offset = 0
    ): Promise<CxRequestSummary[]> => {
        try {
            const params = new URLSearchParams({
                limit: String(limit),
                offset: String(offset),
            });
            if (!isAuthenticated && fingerprintId) {
                params.set('fingerprint_id', fingerprintId);
            }

            const res = await fetch(`/api/cx-chat/history?${params}`);
            const json = await res.json();
            return json.success ? json.data : [];
        } catch (error) {
            console.error('loadHistory error:', error);
            return [];
        }
    }, [isAuthenticated, fingerprintId]);

    /** Load a full conversation by request ID */
    const loadConversation = useCallback(async (
        requestId: string
    ): Promise<CxRequestWithMessages | null> => {
        try {
            const res = await fetch(`/api/cx-chat/request?id=${requestId}`);
            const json = await res.json();
            return json.success ? json.data : null;
        } catch (error) {
            console.error('loadConversation error:', error);
            return null;
        }
    }, []);

    /** Rename a conversation */
    const renameRequest = useCallback(async (
        requestId: string,
        newLabel: string
    ): Promise<boolean> => {
        try {
            const res = await fetch('/api/cx-chat/request', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: requestId, label: newLabel }),
            });
            const json = await res.json();
            return json.success;
        } catch (error) {
            console.error('renameRequest error:', error);
            return false;
        }
    }, []);

    /** Delete a conversation */
    const deleteRequest = useCallback(async (
        requestId: string
    ): Promise<boolean> => {
        try {
            const res = await fetch(`/api/cx-chat/request?id=${requestId}`, {
                method: 'DELETE',
            });
            const json = await res.json();
            return json.success;
        } catch (error) {
            console.error('deleteRequest error:', error);
            return false;
        }
    }, []);

    /** Update request status */
    const updateRequestStatus = useCallback(async (
        requestId: string,
        status: 'active' | 'completed' | 'error' | 'archived'
    ): Promise<boolean> => {
        try {
            const res = await fetch('/api/cx-chat/request', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: requestId, status }),
            });
            const json = await res.json();
            return json.success;
        } catch (error) {
            console.error('updateRequestStatus error:', error);
            return false;
        }
    }, []);

    return {
        createRequest,
        saveMessages,
        loadHistory,
        loadConversation,
        renameRequest,
        deleteRequest,
        updateRequestStatus,
        pendingRequestId: pendingRequestId.current,
    };
}
