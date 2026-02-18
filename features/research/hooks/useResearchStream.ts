'use client';

import { useState, useCallback, useRef } from 'react';
import { consumeStream } from '@/lib/api/stream-parser';
import type { StatusUpdatePayload, ErrorPayload, EndPayload } from '@/lib/api/types';
import type { ResearchStreamStep } from '../types';

interface StreamMessage {
    id: string;
    timestamp: number;
    status: ResearchStreamStep;
    message: string;
}

interface UseResearchStreamReturn {
    isStreaming: boolean;
    messages: StreamMessage[];
    currentStep: ResearchStreamStep | null;
    error: string | null;
    startStream: (response: Response) => Promise<void>;
    cancel: () => void;
    clearMessages: () => void;
}

export function useResearchStream(
    onComplete?: () => void,
): UseResearchStreamReturn {
    const [isStreaming, setIsStreaming] = useState(false);
    const [messages, setMessages] = useState<StreamMessage[]>([]);
    const [currentStep, setCurrentStep] = useState<ResearchStreamStep | null>(null);
    const [error, setError] = useState<string | null>(null);
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

    const startStream = useCallback(async (response: Response) => {
        const controller = new AbortController();
        abortRef.current = controller;
        setIsStreaming(true);
        setError(null);
        setMessages([]);
        setCurrentStep(null);

        try {
            await consumeStream(response, {
                onStatusUpdate: (data: StatusUpdatePayload) => {
                    const step = (data.status as ResearchStreamStep) || 'searching';
                    setCurrentStep(step);
                    if (data.user_message) {
                        addMessage(step, data.user_message);
                    }
                },
                onData: (data: Record<string, unknown>) => {
                    const event = data.event as string;
                    if (event) {
                        addMessage('searching', event);
                    }
                },
                onError: (err) => {
                    setError((err as unknown as ErrorPayload).user_message || (err as unknown as ErrorPayload).message || 'An error occurred');
                    setCurrentStep('error');
                },
                onEnd: (_data: EndPayload) => {
                    setCurrentStep('complete');
                    onComplete?.();
                },
            }, controller.signal);
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                setError((err as Error).message);
                setCurrentStep('error');
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
    }, []);

    return {
        isStreaming,
        messages,
        currentStep,
        error,
        startStream,
        cancel,
        clearMessages,
    };
}
