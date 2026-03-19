/**
 * usePromptExecutionAdapter — thin adapter hook that bridges prompt-execution slice
 * state into chatConversationsSlice for unified UI rendering.
 *
 * HOW IT WORKS:
 * 1. Creates a chatConversations session with the same runId as sessionId
 * 2. Watches prompt-execution messages and syncs them to chatConversations
 * 3. Watches streaming text and syncs chunks
 * 4. The ConversationShell/MessageList reads from chatConversations for display
 *
 * The prompt-execution slice remains the source of truth for:
 * - Variable resolution
 * - executeMessage thunk
 * - Dynamic contexts
 * - Run management
 *
 * This adapter is TEMPORARY — once prompt-execution is fully migrated to
 * chatConversations, this hook is deleted.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { chatConversationsActions } from '@/features/cx-conversation/redux/slice';
import {
    selectIsExecuting,
    selectStreamingTextForInstance,
} from '@/lib/redux/prompt-execution/selectors';
import { selectMessages } from '@/lib/redux/prompt-execution/slice';
import type { ConversationMessage as ChatConversationMessage } from '@/features/cx-conversation/redux/types';
import { v4 as uuidv4 } from 'uuid';

interface UsePromptExecutionAdapterOptions {
    /** The runId from prompt-execution — used as sessionId in chatConversations */
    runId: string;
    /** The agentId / promptId for this execution */
    agentId: string;
    enabled?: boolean;
}

/**
 * @deprecated Use chatConversations slice directly when prompt-execution is retired.
 */
export function usePromptExecutionAdapter({
    runId,
    agentId,
    enabled = true,
}: UsePromptExecutionAdapterOptions) {
    const dispatch = useAppDispatch();
    const initializedRef = useRef(false);
    const prevMessageCountRef = useRef(0);
    const lastStreamChunkRef = useRef<string>('');
    const streamingMessageIdRef = useRef<string | null>(null);

    // Read from prompt-execution
    const messages = useAppSelector((state) => (enabled ? selectMessages(state, runId) : []));
    const isExecuting = useAppSelector((state) => (enabled ? selectIsExecuting(state, runId) : false));
    const streamingText = useAppSelector(
        (state) => (enabled ? selectStreamingTextForInstance(state, runId) : null)
    );

    // Initialize the chatConversations session on mount
    useEffect(() => {
        if (!enabled || !runId || initializedRef.current) return;
        initializedRef.current = true;

        dispatch(chatConversationsActions.startSession({
            sessionId: runId,
            agentId,
        }));
    }, [runId, agentId, enabled, dispatch]);

    // Sync messages from prompt-execution into chatConversations
    useEffect(() => {
        if (!enabled || !runId || !messages) return;

        // Only sync newly added messages
        const count = messages.length;
        if (count <= prevMessageCountRef.current) return;

        const newMessages = messages.slice(prevMessageCountRef.current);
        prevMessageCountRef.current = count;

        for (const msg of newMessages) {
            const id = uuidv4();

            if (msg.role === 'assistant') {
                streamingMessageIdRef.current = id;
            }

            const convMsg: ChatConversationMessage = {
                id,
                role: msg.role as ChatConversationMessage['role'],
                content: msg.content ?? '',
                status: 'complete',
                timestamp: msg.timestamp ?? new Date().toISOString(),
                metadata: msg.metadata,
            };

            dispatch(chatConversationsActions.addMessage({ sessionId: runId, message: convMsg }));
        }
    }, [messages, runId, enabled, dispatch]);

    // Sync streaming text chunks
    useEffect(() => {
        if (!enabled || !runId || !streamingText || !streamingMessageIdRef.current) return;

        const newChunk = streamingText.slice(lastStreamChunkRef.current.length);
        if (!newChunk) return;

        lastStreamChunkRef.current = streamingText;

        dispatch(chatConversationsActions.appendStreamChunk({
            sessionId: runId,
            messageId: streamingMessageIdRef.current,
            chunk: newChunk,
        }));
    }, [streamingText, runId, enabled, dispatch]);

    // Sync execution status
    useEffect(() => {
        if (!enabled || !runId) return;
        dispatch(chatConversationsActions.setSessionStatus({
            sessionId: runId,
            status: isExecuting ? 'executing' : 'ready',
        }));
    }, [isExecuting, runId, enabled, dispatch]);

    return {
        sessionId: runId,
    };
}
