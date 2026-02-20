'use client';

import { useState, useCallback, useRef } from 'react';
import { consumeStream } from '@/lib/api/stream-parser';
import type { StatusUpdatePayload, EndPayload, CompletionPayload, ToolEventPayload } from '@/lib/api/types';
import type { StreamEvent } from '@/types/python-generated/stream-events';
import type { ResearchStreamStep, ResearchDataEvent, ResearchStreamCallbacks } from '../types';

export interface StreamMessage {
    id: string;
    timestamp: number;
    status: ResearchStreamStep;
    message: string;
}

export interface UseResearchStreamReturn {
    isStreaming: boolean;
    streamingText: string;
    messages: StreamMessage[];
    currentStep: ResearchStreamStep | null;
    error: string | null;
    rawEvents: StreamEvent[];
    startStream: (response: Response, callbacks?: ResearchStreamCallbacks) => Promise<void>;
    cancel: () => void;
    clearMessages: () => void;
}

/**
 * Core streaming hook for all research operations.
 *
 * Page load: DB snapshot populates state.
 * After that: every domain object arrives via `data` events and is merged
 * into local state immediately — no DB refetch needed.
 *
 * Pass per-call callbacks to `startStream` for domain-specific handling.
 * The hook handles progress messages and error state automatically.
 */
export function useResearchStream(
    onComplete?: () => void,
): UseResearchStreamReturn {
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [messages, setMessages] = useState<StreamMessage[]>([]);
    const [currentStep, setCurrentStep] = useState<ResearchStreamStep | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [rawEvents, setRawEvents] = useState<StreamEvent[]>([]);
    const abortRef = useRef<AbortController | null>(null);
    const idCounter = useRef(0);

    const addMessage = useCallback((status: ResearchStreamStep, message: string) => {
        setMessages(prev => [...prev, {
            id: `msg-${++idCounter.current}`,
            timestamp: Date.now(),
            status,
            message,
        }]);
    }, []);

    const startStream = useCallback(async (response: Response, callbacks?: ResearchStreamCallbacks) => {
        const controller = new AbortController();
        abortRef.current = controller;
        setIsStreaming(true);
        setError(null);
        setMessages([]);
        setCurrentStep(null);
        setStreamingText('');
        setRawEvents([]);

        try {
            await consumeStream(response, {
                onRawLine: (event: StreamEvent) => {
                    setRawEvents(prev => [...prev, event]);
                },

                onChunk: (text: string) => {
                    setStreamingText(prev => prev + text);
                    callbacks?.onChunk?.(text);
                },

                onStatusUpdate: (data: StatusUpdatePayload) => {
                    const step = (data.status as ResearchStreamStep) || 'searching';
                    setCurrentStep(step);
                    if (data.user_message) {
                        addMessage(step, data.user_message);
                    }
                    callbacks?.onStatusUpdate?.(
                        step,
                        data.user_message ?? data.system_message ?? '',
                        data.metadata ?? undefined,
                    );
                },

                onData: (data: Record<string, unknown>) => {
                    // Backend uses `data.event` as the discriminator (not `data.type`)
                    // e.g. {"event":"data","data":{"event":"scrape_complete","source_id":"...",...}}
                    if (data.event && typeof data.event === 'string') {
                        callbacks?.onData?.(data as unknown as ResearchDataEvent);
                    }
                },

                onCompletion: (data: CompletionPayload) => {
                    callbacks?.onCompletion?.(data as unknown as Record<string, unknown>);
                },

                onToolEvent: (data: ToolEventPayload) => {
                    callbacks?.onToolEvent?.(data as unknown as Record<string, unknown>);
                },

                onError: (err) => {
                    const msg = (err as unknown as { user_message?: string; message?: string }).user_message
                        ?? (err as unknown as { message?: string }).message
                        ?? 'An error occurred';
                    setError(msg);
                    setCurrentStep('error');
                    callbacks?.onError?.(msg);
                },

                onEnd: (_data: EndPayload) => {
                    setCurrentStep('complete');
                    callbacks?.onEnd?.();
                    onComplete?.();
                },

                onEvent: (event: StreamEvent) => {
                    // Forward unhandled event types to the debug callback
                    const handled = ['chunk', 'status_update', 'data', 'completion', 'tool_event', 'error', 'heartbeat', 'end'];
                    if (!handled.includes(event.event)) {
                        callbacks?.onUnknownEvent?.(event as { event: string; data: unknown });
                    }
                },
            }, controller.signal);
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                const msg = (err as Error).message;
                setError(msg);
                setCurrentStep('error');
                callbacks?.onError?.(msg);
            }
        } finally {
            setIsStreaming(false);
            abortRef.current = null;
        }
    }, [addMessage, onComplete]);

    const cancel = useCallback(() => {
        abortRef.current?.abort();
        setIsStreaming(false);
        setCurrentStep(null);
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setCurrentStep(null);
        setError(null);
        setStreamingText('');
        setRawEvents([]);
    }, []);

    return {
        isStreaming,
        streamingText,
        messages,
        currentStep,
        error,
        rawEvents,
        startStream,
        cancel,
        clearMessages,
    };
}
