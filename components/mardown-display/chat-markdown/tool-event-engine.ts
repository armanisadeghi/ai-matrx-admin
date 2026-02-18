/**
 * Tool Event Engine — Single Source of Truth
 *
 * Converts V2 `tool_event` streaming events into the `ToolCallObject`
 * shape that all renderers consume.
 *
 * EVERY consumer in the codebase must use these functions instead of inline
 * conversion logic. This guarantees that backend contract changes are fixed
 * in exactly one place.
 *
 * Backend contract for `tool_event` (ToolEventPayload.data):
 *   tool_started:        { arguments: Record<string, unknown> }
 *   tool_progress:       { ...custom }
 *   tool_step:           { step: string, ...custom }
 *   tool_result_preview: { preview: string }
 *   tool_completed:      { result: unknown }
 *   tool_error:          { error_type: string }
 */

import type { StreamEvent, ToolEventPayload, ChunkPayload } from '@/types/python-generated/stream-events';
import type { ToolCallObject } from '@/lib/api/tool-call.types';

// ============================================================================
// SINGLE-EVENT CONVERSION
// ============================================================================

/**
 * Convert a `tool_event` StreamEvent into a ToolCallObject.
 * Returns null if the event is not a tool_event or has no data.
 *
 * The ToolCallObject `id` is set to the backend `call_id` so that
 * subsequent events for the same tool call (started -> progress -> completed)
 * are grouped together by consumers.
 */
export function convertToolEvent(event: StreamEvent): ToolCallObject | null {
    if (event.event !== 'tool_event' || !event.data) return null;

    const te = event.data as unknown as ToolEventPayload;
    const eventData = te.data ?? {};

    switch (te.event) {
        case 'tool_started':
            return {
                id: te.call_id,
                type: 'mcp_input',
                mcp_input: {
                    name: te.tool_name,
                    arguments: (eventData.arguments as Record<string, unknown>) ?? {},
                },
                user_message: te.message ?? undefined,
            };

        case 'tool_progress':
        case 'tool_step':
            return {
                id: te.call_id,
                type: 'user_message',
                user_message: te.message ?? undefined,
                step_data: Object.keys(eventData).length > 0
                    ? (eventData as unknown as ToolCallObject['step_data'])
                    : undefined,
            };

        case 'tool_result_preview':
            return {
                id: te.call_id,
                type: 'step_data',
                step_data: eventData as unknown as ToolCallObject['step_data'],
                user_message: te.message ?? undefined,
            };

        case 'tool_completed':
            return {
                id: te.call_id,
                type: 'mcp_output',
                mcp_output: {
                    status: 'success',
                    result: eventData.result ?? eventData,
                } as ToolCallObject['mcp_output'],
                user_message: te.message ?? undefined,
            };

        case 'tool_error':
            return {
                id: te.call_id,
                type: 'mcp_error',
                mcp_error: (te.message || 'Tool execution failed') ?? undefined,
            };

        default:
            return null;
    }
}

/**
 * Convert any StreamEvent into a ToolCallObject.
 * Returns null for non-tool events.
 */
export function convertStreamEventToToolCall(event: StreamEvent): ToolCallObject | null {
    return convertToolEvent(event);
}

/**
 * Extract the tool ID from a StreamEvent.
 * Returns null for non-tool events.
 */
export function getToolIdFromEvent(event: StreamEvent): string | null {
    if (event.event === 'tool_event' && event.data) {
        return (event.data as unknown as ToolEventPayload).call_id || null;
    }
    return null;
}

/**
 * Extract the tool name from a StreamEvent.
 * Returns null for non-tool events.
 */
export function getToolNameFromEvent(event: StreamEvent): string | null {
    if (event.event === 'tool_event' && event.data) {
        return (event.data as unknown as ToolEventPayload).tool_name || null;
    }
    return null;
}

// ============================================================================
// BATCH CONVERSION — for post-stream persistence and DB-loaded data
// ============================================================================

/**
 * Filter a stream event array down to only the tool events that should be
 * persisted on the assistant message (for DB-loaded conversations).
 *
 * Only `tool_started`, `tool_completed`, and `tool_error` are persisted —
 * progress/step/preview events are informational and not needed after
 * the stream ends.
 */
export function extractPersistableToolUpdates(events: StreamEvent[]): ToolCallObject[] {
    const updates: ToolCallObject[] = [];

    for (const event of events) {
        if (event.event === 'tool_event' && event.data) {
            const te = event.data as unknown as ToolEventPayload;
            if (te.event === 'tool_started' || te.event === 'tool_completed' || te.event === 'tool_error') {
                const obj = convertToolEvent(event);
                if (obj) updates.push(obj);
            }
        }
    }

    return updates;
}

// ============================================================================
// CONTENT BLOCK BUILDING — ordered interleaved text + tool blocks
// ============================================================================

export interface TextBlock {
    type: 'text';
    content: string;
}

export interface ToolBlock {
    type: 'tool';
    toolId: string;
    updates: ToolCallObject[];
}

export type ContentBlock = TextBlock | ToolBlock;

/**
 * Converts a flat array of StreamEvents into ordered content blocks.
 *
 * - Consecutive `chunk` events are merged into a single TextBlock.
 * - Each unique tool ID gets its own ToolBlock, positioned where the first
 *   event for that ID appeared.
 * - Subsequent events for the same ID are appended to the existing ToolBlock
 *   (in-place), preserving the original position in the sequence.
 */
export function buildStreamBlocks(events: StreamEvent[]): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    const toolBlockIndices = new Map<string, number>();

    function pushToolUpdate(toolId: string, update: ToolCallObject) {
        if (toolBlockIndices.has(toolId)) {
            const idx = toolBlockIndices.get(toolId)!;
            (blocks[idx] as ToolBlock).updates.push(update);
        } else {
            toolBlockIndices.set(toolId, blocks.length);
            blocks.push({ type: 'tool', toolId, updates: [update] });
        }
    }

    for (const event of events) {
        if (event.event === 'chunk') {
            const text = (event.data as unknown as ChunkPayload).text;
            const lastBlock = blocks[blocks.length - 1];
            if (lastBlock && lastBlock.type === 'text') {
                lastBlock.content += text;
            } else {
                blocks.push({ type: 'text', content: text });
            }
        } else if (event.event === 'tool_event') {
            const toolId = getToolIdFromEvent(event) || `tool-anon-${blocks.length}`;
            const toolCallObj = convertStreamEventToToolCall(event);
            if (toolCallObj) {
                pushToolUpdate(toolId, toolCallObj);
            }
        }
    }

    return blocks;
}
