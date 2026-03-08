/**
 * lib/chat-protocol/from-stream.ts
 *
 * Converts raw StreamEvent arrays into CanonicalBlock[] / StreamingState.
 *
 * DESIGN PRINCIPLES
 * ─────────────────
 * • Zero platform deps — pure TypeScript, no JSX, no React.
 * • Single source of truth — all stream-to-canonical logic lives here.
 * • Immutable output — every returned object is readonly.
 * • Event engine stays here — no consumer should pick through StreamEvent[].
 *
 * STREAM CONTRACT (backend ToolEventPayload.event values)
 * ────────────────────────────────────────────────────────
 *   tool_started        → creates ToolCallBlock (phase: 'running')
 *   tool_progress       → appends ToolProgress to existing block
 *   tool_step           → appends ToolProgress to existing block
 *   tool_result_preview → appends ToolProgress to existing block
 *   tool_completed      → sets output, phase: 'complete'
 *   tool_error          → sets error, phase: 'error'
 *   chunk               → appends to / creates TextBlock
 *   error               → creates ErrorBlock
 *   thinking (future)   → creates ThinkingBlock
 */

import type {
    StreamEvent,
    ToolEventPayload,
    ChunkPayload,
    ErrorPayload,
} from '@/types/python-generated/stream-events';

import type {
    CanonicalBlock,
    TextBlock,
    ToolCallBlock,
    ThinkingBlock,
    ErrorBlock,
    ToolInput,
    ToolOutput,
    ToolProgress,
    StreamingState,
    CanonicalMessage,
    MessageStatus,
} from './types';

import { PROTOCOL_VERSION } from './types';

// ============================================================================
// INTERNAL MUTABLE TYPES (never leave this module)
// ============================================================================

/** Mutable counterpart of ToolCallBlock used while building. */
interface MutableToolCallBlock {
    type: 'tool_call';
    callId: string;
    toolName: string;
    input: ToolInput;
    output?: ToolOutput;
    error?: { message: string };
    progress: ToolProgress[];
    phase: 'pending' | 'running' | 'complete' | 'error';
}

/** Mutable counterpart of TextBlock used while building. */
interface MutableTextBlock {
    type: 'text';
    content: string;
}

type MutableBlock = MutableTextBlock | MutableToolCallBlock | ThinkingBlock | ErrorBlock;

// ============================================================================
// CORE BUILDER
// ============================================================================

/**
 * Incrementally converts a stream of StreamEvents into an ordered array of
 * canonical blocks.
 *
 * Call this once on a complete array, or call it progressively in real time
 * (the function is pure and O(n) — safe to call on every new event batch).
 */
export function buildCanonicalBlocks(events: StreamEvent[]): CanonicalBlock[] {
    const blocks: MutableBlock[] = [];

    /** Index in `blocks` by tool callId — O(1) lookup for subsequent events. */
    const toolIndex = new Map<string, number>();

    // ------------------------------------------------------------------
    function getOrCreateToolBlock(callId: string, toolName: string): number {
        if (toolIndex.has(callId)) return toolIndex.get(callId)!;
        const idx = blocks.length;
        blocks.push({
            type: 'tool_call',
            callId,
            toolName,
            input: { name: toolName, arguments: {} },
            progress: [],
            phase: 'pending',
        });
        toolIndex.set(callId, idx);
        return idx;
    }

    function toolBlock(callId: string): MutableToolCallBlock | null {
        const idx = toolIndex.get(callId);
        if (idx === undefined) return null;
        return blocks[idx] as MutableToolCallBlock;
    }
    // ------------------------------------------------------------------

    for (const event of events) {
        // ── Text chunk ──────────────────────────────────────────────────
        if (event.event === 'chunk') {
            const text = (event.data as ChunkPayload).text ?? '';
            if (!text) continue;

            const last = blocks[blocks.length - 1];
            if (last && last.type === 'text') {
                (last as MutableTextBlock).content += text;
            } else {
                blocks.push({ type: 'text', content: text });
            }
            continue;
        }

        // ── Tool event ──────────────────────────────────────────────────
        if (event.event === 'tool_event') {
            const te = event.data as ToolEventPayload;
            const { call_id: callId, tool_name: toolName, message } = te;
            const data = te.data ?? {};

            switch (te.event) {
                case 'tool_started': {
                    const idx = getOrCreateToolBlock(callId, toolName);
                    const tb = blocks[idx] as MutableToolCallBlock;
                    tb.input = {
                        name: toolName,
                        arguments: (data.arguments as Record<string, unknown>) ?? {},
                    };
                    tb.phase = 'running';
                    if (message) tb.progress.push({ message });
                    break;
                }

                case 'tool_progress':
                case 'tool_step':
                case 'tool_result_preview': {
                    // Ensure block exists (may receive progress before started in edge cases)
                    getOrCreateToolBlock(callId, toolName);
                    const tb = toolBlock(callId)!;
                    if (message) tb.progress.push({ message });
                    break;
                }

                case 'tool_completed': {
                    getOrCreateToolBlock(callId, toolName);
                    const tb = toolBlock(callId)!;
                    tb.output = {
                        status: 'success',
                        result: data.result ?? data,
                    };
                    tb.phase = 'complete';
                    if (message) tb.progress.push({ message });
                    break;
                }

                case 'tool_error': {
                    getOrCreateToolBlock(callId, toolName);
                    const tb = toolBlock(callId)!;
                    tb.error = { message: message ?? 'Tool execution failed' };
                    tb.phase = 'error';
                    break;
                }
            }
            continue;
        }

        // ── Stream-level error ──────────────────────────────────────────
        if (event.event === 'error') {
            const err = event.data as ErrorPayload;
            blocks.push({
                type: 'error',
                errorType: err.error_type ?? 'unknown',
                message: err.message ?? 'An error occurred',
            });
            continue;
        }

        // All other events (status_update, broker, heartbeat, end, completion)
        // carry no renderable content — intentionally ignored.
    }

    // Freeze mutable blocks into readonly CanonicalBlocks before returning.
    return blocks as unknown as CanonicalBlock[];
}

// ============================================================================
// STREAMING STATE — live view for active streams
// ============================================================================

/**
 * Build a live StreamingState from the events received so far.
 *
 * This is a pure function — call it on every new event batch during streaming.
 * The output is immutable and safe to pass directly to renderers.
 */
export function buildStreamingState(events: StreamEvent[]): StreamingState {
    const blocks = buildCanonicalBlocks(events);

    // Determine whether the stream is still live (no 'end' or stream-level 'error')
    const hasEnd   = events.some(e => e.event === 'end');
    const hasError = events.some(e => e.event === 'error');
    const isLive   = !hasEnd && !hasError;

    const streamError = blocks.find((b): b is ErrorBlock => b.type === 'error');

    return {
        blocks,
        isLive,
        streamError,
    };
}

// ============================================================================
// PERSISTENCE HELPER — extract what should be saved after a stream completes
// ============================================================================

/**
 * Extract the persistable subset of tool blocks from a completed stream.
 *
 * Progress notifications are stripped — only the final input/output/error
 * state needs to be stored in the DB.
 */
export function extractPersistableToolBlocks(
    events: StreamEvent[],
): ReadonlyArray<ToolCallBlock> {
    const blocks = buildCanonicalBlocks(events);
    return blocks.filter((b): b is ToolCallBlock => b.type === 'tool_call');
}

// ============================================================================
// FULL MESSAGE BUILDER — for a completed / DB-loaded message
// ============================================================================

/**
 * Build a complete CanonicalMessage from a finished stream.
 *
 * Typically called in the `onComplete` callback of a streaming hook,
 * immediately before the message is persisted and the stream events cleared.
 */
export function buildCanonicalMessageFromStream(params: {
    id: string;
    timestamp?: Date;
    status?: MessageStatus;
    events: StreamEvent[];
}): CanonicalMessage {
    const { id, timestamp = new Date(), status = 'complete', events } = params;
    return {
        id,
        role: 'assistant',
        timestamp,
        status,
        isCondensed: false,
        blocks: buildCanonicalBlocks(events),
        schemaVersion: PROTOCOL_VERSION,
    };
}
