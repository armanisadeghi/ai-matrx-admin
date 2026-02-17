// lib/api/stream-parser.ts
// Reusable NDJSON stream parser for the Python FastAPI backend.
// Replaces 5+ duplicated implementations across the codebase.

import type { BackendStreamEvent, StreamEventType } from './types';
import { parseStreamError, BackendApiError } from './errors';

// ============================================================================
// NDJSON STREAM PARSER
// ============================================================================

/**
 * Parse an NDJSON streaming response into typed events.
 *
 * Usage:
 * ```typescript
 * const response = await fetch(url, { ... });
 * for await (const event of parseNdjsonStream(response)) {
 *   switch (event.event) {
 *     case 'chunk': handleChunk(event.data as string); break;
 *     case 'error': handleError(event.data); break;
 *     case 'end': handleEnd(); break;
 *   }
 * }
 * ```
 */
export async function* parseNdjsonStream<T = unknown>(
    response: Response,
    signal?: AbortSignal,
): AsyncGenerator<BackendStreamEvent<T>, void, undefined> {
    if (!response.body) {
        throw new BackendApiError({
            code: 'internal_error',
            detail: 'Response has no body',
            userMessage: 'No response received from server',
        });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            if (signal?.aborted) {
                break;
            }

            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Split on newlines — last element may be incomplete
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                try {
                    const parsed = JSON.parse(trimmed) as BackendStreamEvent<T>;
                    yield parsed;
                } catch {
                    // Non-JSON line — skip silently
                    console.warn('[stream-parser] Failed to parse NDJSON line:', trimmed);
                }
            }
        }

        // Process remaining buffer
        const remaining = buffer.trim();
        if (remaining) {
            try {
                const parsed = JSON.parse(remaining) as BackendStreamEvent<T>;
                yield parsed;
            } catch {
                // Ignore incomplete trailing data
            }
        }
    } finally {
        reader.releaseLock();
    }
}

// ============================================================================
// STREAM EVENT HELPERS
// ============================================================================

/** Type guard for checking stream event types */
export function isStreamEvent(
    event: BackendStreamEvent,
    type: StreamEventType,
): boolean {
    return event.event === type;
}

/** Extract accumulated text from chunk events */
export function accumulateChunks(events: BackendStreamEvent[]): string {
    let text = '';
    for (const event of events) {
        if (event.event === 'chunk' && typeof event.data === 'string') {
            text += event.data;
        }
    }
    return text;
}

/** Extract error from stream events, if any */
export function findStreamError(events: BackendStreamEvent[]): BackendApiError | null {
    for (const event of events) {
        if (event.event === 'error') {
            return parseStreamError(event.data);
        }
    }
    return null;
}

// ============================================================================
// CALLBACK-BASED STREAM CONSUMER
// ============================================================================

/**
 * Stream event handler callbacks.
 * Provides a familiar callback API on top of the async generator.
 */
export interface StreamCallbacks<T = unknown> {
    onEvent?: (event: BackendStreamEvent<T>) => void;
    onChunk?: (text: string) => void;
    onStatusUpdate?: (data: Record<string, unknown>) => void;
    onToolEvent?: (data: unknown) => void;
    onData?: (data: unknown) => void;
    onError?: (error: BackendApiError) => void;
    onEnd?: () => void;
    onRawLine?: (parsed: BackendStreamEvent<T>) => void;
}

/**
 * Consume a streaming response with callbacks.
 * Convenience wrapper over `parseNdjsonStream` for components
 * that prefer callbacks over async iteration.
 */
export async function consumeStream<T = unknown>(
    response: Response,
    callbacks: StreamCallbacks<T>,
    signal?: AbortSignal,
): Promise<void> {
    for await (const event of parseNdjsonStream<T>(response, signal)) {
        callbacks.onRawLine?.(event);
        callbacks.onEvent?.(event);

        switch (event.event) {
            case 'chunk':
                if (typeof event.data === 'string') {
                    callbacks.onChunk?.(event.data);
                }
                break;
            case 'status_update':
                callbacks.onStatusUpdate?.(event.data as Record<string, unknown>);
                break;
            case 'tool_event':
            case 'tool_update':
                callbacks.onToolEvent?.(event.data);
                break;
            case 'data':
                callbacks.onData?.(event.data);
                break;
            case 'error':
                callbacks.onError?.(parseStreamError(event.data));
                break;
            case 'end':
                callbacks.onEnd?.();
                break;
        }
    }
}
