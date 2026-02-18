// lib/api/stream-parser.ts
// Reusable NDJSON stream parser for the Python FastAPI backend.
// Single implementation — all consumers use this instead of inline parsing.

import type {
    StreamEvent,
    ChunkPayload,
    CompletionPayload,
    ErrorPayload,
    StatusUpdatePayload,
    ToolEventPayload,
    HeartbeatPayload,
    EndPayload,
} from './types';
import { parseStreamError, BackendApiError } from './errors';

// ============================================================================
// NDJSON STREAM PARSER
// ============================================================================

/**
 * Parse an NDJSON streaming response into typed events.
 *
 * Returns the `X-Request-ID` header value (if present) alongside the generator,
 * so callers can use it for cancellation.
 *
 * Usage:
 * ```typescript
 * const response = await fetch(url, { ... });
 * const { events, requestId } = parseNdjsonStream(response);
 * for await (const event of events) {
 *   if (event.event === 'chunk') appendToMessage(event.data.text);
 * }
 * ```
 */
export function parseNdjsonStream(
    response: Response,
    signal?: AbortSignal,
): { events: AsyncGenerator<StreamEvent, void, undefined>; requestId: string | null } {
    const requestId = response.headers.get('X-Request-ID');
    return {
        events: _parseNdjsonStream(response, signal),
        requestId,
    };
}

async function* _parseNdjsonStream(
    response: Response,
    signal?: AbortSignal,
): AsyncGenerator<StreamEvent, void, undefined> {
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

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                try {
                    const parsed = JSON.parse(trimmed) as StreamEvent;
                    yield parsed;
                } catch {
                    console.warn('[stream-parser] Failed to parse NDJSON line:', trimmed);
                }
            }
        }

        const remaining = buffer.trim();
        if (remaining) {
            try {
                const parsed = JSON.parse(remaining) as StreamEvent;
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

/** Extract accumulated text from chunk events */
export function accumulateChunks(events: StreamEvent[]): string {
    let text = '';
    for (const event of events) {
        if (event.event === 'chunk') {
            text += (event.data as unknown as ChunkPayload).text;
        }
    }
    return text;
}

/** Extract error from stream events, if any */
export function findStreamError(events: StreamEvent[]): BackendApiError | null {
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
export interface StreamCallbacks {
    onEvent?: (event: StreamEvent) => void;
    onChunk?: (text: string) => void;
    onStatusUpdate?: (data: StatusUpdatePayload) => void;
    onToolEvent?: (data: ToolEventPayload) => void;
    onCompletion?: (data: CompletionPayload) => void;
    onData?: (data: Record<string, unknown>) => void;
    onError?: (error: BackendApiError) => void;
    onHeartbeat?: (data: HeartbeatPayload) => void;
    onEnd?: (data: EndPayload) => void;
    onRawLine?: (parsed: StreamEvent) => void;
}

/**
 * Consume a streaming response with callbacks.
 * Convenience wrapper over the async generator for components
 * that prefer callbacks over async iteration.
 */
export async function consumeStream(
    response: Response,
    callbacks: StreamCallbacks,
    signal?: AbortSignal,
): Promise<{ requestId: string | null }> {
    const { events, requestId } = parseNdjsonStream(response, signal);

    for await (const event of events) {
        callbacks.onRawLine?.(event);
        callbacks.onEvent?.(event);

        const data = event.data as unknown;
        switch (event.event) {
            case 'chunk':
                callbacks.onChunk?.((data as ChunkPayload).text);
                break;
            case 'status_update':
                callbacks.onStatusUpdate?.(data as StatusUpdatePayload);
                break;
            case 'tool_event':
                callbacks.onToolEvent?.(data as ToolEventPayload);
                break;
            case 'completion':
                callbacks.onCompletion?.(data as CompletionPayload);
                break;
            case 'data':
                callbacks.onData?.(data as Record<string, unknown>);
                break;
            case 'error':
                callbacks.onError?.(parseStreamError(data));
                break;
            case 'heartbeat':
                callbacks.onHeartbeat?.(data as HeartbeatPayload);
                break;
            case 'end':
                callbacks.onEnd?.(data as EndPayload);
                break;
        }
    }

    return { requestId };
}
