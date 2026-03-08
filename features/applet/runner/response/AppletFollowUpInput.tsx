'use client';

/**
 * AppletFollowUpInput
 *
 * Renders a textarea + send button below the initial applet response.
 * Allows the user to continue the conversation using the existing
 * POST /api/ai/conversations/{conversationId} endpoint — the same one
 * used by the public chat.
 *
 * Each follow-up turn streams into a fresh Redux listenerId so the
 * existing initial response is never mutated. All follow-up responses
 * render directly below, one after another, using the same MarkdownStream
 * component the rest of the applet uses.
 *
 * No Redux thunk needed here — the conversation continue endpoint is a
 * direct HTTP call that streams NDJSON, same as the agent start call.
 * We reuse parseNdjsonStream + socketResponseSlice directly.
 */

import React, { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAppDispatch } from '@/lib/redux/hooks';
import { parseNdjsonStream } from '@/lib/api/stream-parser';
import { ENDPOINTS, BACKEND_URLS } from '@/lib/api/endpoints';
import { useApiAuth } from '@/hooks/useApiAuth';
import { selectIsAdmin } from '@/lib/redux/slices/userSlice';
import { selectIsUsingLocalhost } from '@/lib/redux/slices/adminPreferencesSlice';
import { useAppSelector } from '@/lib/redux/hooks';
import {
    addResponse,
    appendTextChunk,
    updateErrorResponse,
    markResponseEnd,
} from '@/lib/redux/socket-io/slices/socketResponseSlice';
import {
    initializeTask,
    setTaskListenerIds,
    setTaskStreaming,
    completeTask,
} from '@/lib/redux/socket-io/slices/socketTasksSlice';
import {
    appendRawToolEvent,
} from '@/lib/redux/socket-io/slices/socketResponseSlice';
import MarkdownStream from '@/components/MarkdownStream';
import type { ChunkPayload, ErrorPayload, StreamEvent } from '@/types/python-generated/stream-events';

interface FollowUpTurn {
    userMessage: string;
    taskId: string;
}

interface AppletFollowUpInputProps {
    conversationId: string;
}

export default function AppletFollowUpInput({ conversationId }: AppletFollowUpInputProps) {
    const dispatch = useAppDispatch();
    const { getHeaders } = useApiAuth();
    const isAdmin = useAppSelector(selectIsAdmin);
    const isLocalhost = useAppSelector(selectIsUsingLocalhost);

    const [inputValue, setInputValue] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [turns, setTurns] = useState<FollowUpTurn[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const getBackendUrl = useCallback(() => {
        return isAdmin && isLocalhost ? BACKEND_URLS.localhost : BACKEND_URLS.production;
    }, [isAdmin, isLocalhost]);

    const adjustHeight = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }, []);

    const sendFollowUp = useCallback(async () => {
        const content = inputValue.trim();
        if (!content || isStreaming) return;

        const taskId = uuidv4();
        const listenerId = taskId;

        setInputValue('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setTurns((prev) => [...prev, { userMessage: content, taskId }]);
        setIsStreaming(true);

        dispatch(initializeTask({ taskId, service: 'applet_agent', taskName: 'conversation_continue', connectionId: 'fastapi' }));
        dispatch(addResponse({ listenerId, taskId }));
        dispatch(setTaskListenerIds({ taskId, listenerIds: [listenerId] }));

        const BACKEND_URL = getBackendUrl();
        const endpoint = `${BACKEND_URL}${ENDPOINTS.ai.conversationContinue(conversationId)}`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_input: content, stream: true }),
            });

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                throw new Error(`HTTP ${response.status}: ${errText}`);
            }

            const { events } = parseNdjsonStream(response);
            let isFirstChunk = true;

            for await (const event of events) {
                switch (event.event) {
                    case 'chunk': {
                        if (isFirstChunk) {
                            dispatch(setTaskStreaming({ taskId, isStreaming: true }));
                            isFirstChunk = false;
                        }
                        const { text } = event.data as unknown as ChunkPayload;
                        dispatch(appendTextChunk({ listenerId, text }));
                        break;
                    }
                    case 'tool_event': {
                        dispatch(appendRawToolEvent({ listenerId, event: event as StreamEvent }));
                        break;
                    }
                    case 'error': {
                        const errData = event.data as unknown as ErrorPayload;
                        dispatch(updateErrorResponse({
                            listenerId,
                            error: {
                                message: errData.message,
                                type: errData.error_type,
                                user_message: errData.user_message,
                            },
                        }));
                        break;
                    }
                    case 'completion':
                    case 'heartbeat':
                    case 'end':
                        break;
                }
            }
        } catch (err) {
            console.error('[AppletFollowUpInput] Conversation continue failed:', err);
            dispatch(updateErrorResponse({
                listenerId,
                error: { message: err instanceof Error ? err.message : 'Request failed', type: 'stream_error' },
            }));
        } finally {
            dispatch(setTaskStreaming({ taskId, isStreaming: false }));
            dispatch(markResponseEnd(listenerId));
            dispatch(completeTask(taskId));
            setIsStreaming(false);
        }
    }, [inputValue, isStreaming, conversationId, dispatch, getBackendUrl, getHeaders]);

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendFollowUp();
        }
    }, [sendFollowUp]);

    return (
        <div className="w-full max-w-4xl mx-auto mt-4 space-y-4">
            {/* Follow-up turns rendered in order */}
            {turns.map((turn) => (
                <div key={turn.taskId} className="space-y-3">
                    {/* User message bubble */}
                    <div className="flex justify-end">
                        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                            {turn.userMessage}
                        </div>
                    </div>
                    {/* Assistant response stream */}
                    <MarkdownStream
                        taskId={turn.taskId}
                        type="message"
                        role="assistant"
                        className="bg-textured"
                        hideCopyButton={false}
                    />
                </div>
            ))}

            {/* Input area */}
            <div className="relative rounded-xl border border-border bg-card shadow-sm focus-within:ring-1 focus-within:ring-primary/50 transition-shadow">
                <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => { setInputValue(e.target.value); adjustHeight(); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Follow up on this response..."
                    disabled={isStreaming}
                    rows={1}
                    style={{ fontSize: '16px' }}
                    className="w-full resize-none bg-transparent px-4 pt-3 pb-10 text-sm leading-relaxed outline-none placeholder:text-muted-foreground disabled:opacity-50 scrollbar-none"
                />
                <div className="absolute bottom-2 right-2">
                    <button
                        onClick={sendFollowUp}
                        disabled={!inputValue.trim() || isStreaming}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40 hover:opacity-90"
                    >
                        {isStreaming
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <ArrowUp className="h-4 w-4" />
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
