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

    // Read-ahead queue: the reader loop runs independently of the consumer so
    // that TCP flow-control backpressure never causes the server to see a stall
    // (and emit GeneratorExit). Large payloads (e.g. Brave search results) used
    // to suspend reader.read() while React processed the previous yield, which
    // filled the server-side send buffer and dropped all subsequent events.
    //
    // Notification design: we use a "pending wakeups" counter rather than a
    // single resolve callback to avoid the race where notify() fires while the
    // consumer is between the queue-empty check and the await-new-Promise.
    // Each push increments the counter; each consumer wakeup decrements it.
    // If the counter is already > 0 when the consumer would sleep, it skips
    // the sleep entirely — no wakeup is ever lost.
    const queue: Array<StreamEvent | BackendApiError | null> = []; // null = done
    let pendingWakeups = 0;
    let resolveWaiter: (() => void) | null = null;

    const pushItem = (item: StreamEvent | BackendApiError | null) => {
        queue.push(item);
        pendingWakeups++;
        if (resolveWaiter) {
            const r = resolveWaiter;
            resolveWaiter = null;
            r();
        }
    };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    // Background reader — never yields, never pauses on consumer backpressure.
    const readLoop = async () => {
        let buffer = '';
        let readCount = 0;
        let parsedCount = 0;
        try {
            while (true) {
                if (signal?.aborted) break;

                const { value, done } = await reader.read();
                readCount++;
                console.log(`[stream-parser] read() #${readCount}: done=${done}, bytes=${value?.length ?? 0}`);
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    try {
                        pushItem(JSON.parse(trimmed) as StreamEvent);
                        parsedCount++;
                    } catch {
                        console.warn('[stream-parser] Failed to parse NDJSON line:', trimmed.slice(0, 100));
                    }
                }
            }

            // Flush any remaining partial line (no trailing newline from server).
            const remaining = buffer.trim();
            if (remaining) {
                try {
                    pushItem(JSON.parse(remaining) as StreamEvent);
                    parsedCount++;
                } catch {
                    // Incomplete trailing data — discard silently.
                }
            }
            console.log(`[stream-parser] readLoop done: reads=${readCount}, parsed=${parsedCount}, bufferLeft=${buffer.length}`);
        } catch (err) {
            console.error('[stream-parser] readLoop error:', err);
            if (err instanceof BackendApiError) {
                pushItem(err);
            }
            // Other errors (AbortError, network errors) just end the loop cleanly.
        } finally {
            reader.releaseLock();
            pushItem(null); // sentinel: stream finished
        }
    };

    // Start the background reader immediately — do not await it here.
    const readerPromise = readLoop();

    // Consumer loop: yield queued events as fast as the caller processes them.
    // The reader above never waits on the caller — it always keeps reading.
    try {
        while (true) {
            // If no pending wakeups, sleep until the reader pushes something.
            if (pendingWakeups === 0) {
                await new Promise<void>((resolve) => {
                    resolveWaiter = resolve;
                    // Guard: if a wakeup arrived between the check above and
                    // setting resolveWaiter, resolve immediately.
                    if (pendingWakeups > 0) {
                        resolveWaiter = null;
                        resolve();
                    }
                });
            }

            pendingWakeups--;

            const item = queue.shift();
            if (item === null || item === undefined) break; // null = done sentinel

            if (item instanceof BackendApiError) {
                throw item;
            }

            yield item;
        }
    } finally {
        // Ensure the background reader is awaited to avoid unhandled rejections.
        await readerPromise;
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
