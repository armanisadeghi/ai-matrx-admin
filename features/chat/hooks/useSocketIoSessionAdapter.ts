/**
 * @deprecated
 *
 * SocketIoSessionAdapter — bridges the legacy socket-io response state into
 * the new chatConversationsSlice so the unified UI components can render it.
 *
 * This hook is TEMPORARY and will be deleted once /chat is fully migrated
 * to the NDJSON sendMessage thunk.
 *
 * HOW IT WORKS:
 * - Reads streaming text from selectPrimaryResponseTextByTaskId
 * - Reads tool updates from selectResponseToolUpdatesByListenerId
 * - Writes them into chatConversationsSlice via appendStreamChunk / updateMessage
 * - The ConversationShell/MessageList reads from chatConversationsSlice for display
 *
 * USAGE:
 * 1. Call useSocketIoSessionAdapter({ sessionId, taskId }) when a socket task starts
 * 2. The session must already exist in chatConversationsSlice (created via startSession)
 * 3. Call cleanup() when the task is done
 */

'use client';

import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { chatConversationsActions } from '@/features/cx-conversation/redux/slice';
import {
    selectPrimaryResponseTextByTaskId,
    selectResponseToolUpdatesByListenerId,
} from '@/lib/redux/socket-io/selectors/socket-response-selectors';

interface UseSocketIoSessionAdapterOptions {
    sessionId: string;
    taskId: string | null;
    listenerId?: string;
    enabled?: boolean;
}

/**
 * @deprecated Use sendMessage thunk with NDJSON instead.
 */
export function useSocketIoSessionAdapter({
    sessionId,
    taskId,
    listenerId,
    enabled = true,
}: UseSocketIoSessionAdapterOptions) {
    const dispatch = useAppDispatch();
    const assistantMessageIdRef = useRef<string | null>(null);
    const lastContentRef = useRef<string>('');

    const streamingText = useAppSelector(
        (state) => (enabled && taskId ? selectPrimaryResponseTextByTaskId(taskId)(state) : null)
    );

    const toolUpdates = useAppSelector(
        (state) => (enabled && listenerId ? selectResponseToolUpdatesByListenerId(listenerId)(state) : null)
    );

    // Create an assistant message placeholder on taskId change
    useEffect(() => {
        if (!enabled || !taskId || !sessionId) return;

        const msgId = uuidv4();
        assistantMessageIdRef.current = msgId;
        lastContentRef.current = '';

        dispatch(chatConversationsActions.addMessage({
            sessionId,
            message: {
                id: msgId,
                role: 'assistant',
                content: '',
                status: 'pending',
            },
        }));

        dispatch(chatConversationsActions.setSessionStatus({ sessionId, status: 'executing' }));

        return () => {
            // Finalize the message when taskId changes or component unmounts
            const id = assistantMessageIdRef.current;
            if (id) {
                dispatch(chatConversationsActions.updateMessage({
                    sessionId,
                    messageId: id,
                    updates: { status: 'complete' },
                }));
            }
            dispatch(chatConversationsActions.setSessionStatus({ sessionId, status: 'ready' }));
        };
    }, [taskId, sessionId, enabled, dispatch]);

    // Sync streaming text as chunks arrive
    useEffect(() => {
        if (!enabled || !taskId || !streamingText || !assistantMessageIdRef.current) return;

        const newChunk = streamingText.slice(lastContentRef.current.length);
        if (!newChunk) return;

        lastContentRef.current = streamingText;

        dispatch(chatConversationsActions.appendStreamChunk({
            sessionId,
            messageId: assistantMessageIdRef.current,
            chunk: newChunk,
        }));

        dispatch(chatConversationsActions.setSessionStatus({ sessionId, status: 'streaming' }));
    }, [streamingText, enabled, taskId, sessionId, dispatch]);

    // Sync tool updates when they arrive
    useEffect(() => {
        if (!enabled || !toolUpdates || !assistantMessageIdRef.current) return;

        dispatch(chatConversationsActions.updateMessage({
            sessionId,
            messageId: assistantMessageIdRef.current,
            updates: { toolUpdates: toolUpdates as unknown[] },
        }));
    }, [toolUpdates, enabled, sessionId, dispatch]);

    return {
        assistantMessageId: assistantMessageIdRef.current,
    };
}
