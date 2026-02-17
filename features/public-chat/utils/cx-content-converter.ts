/**
 * cx-content-converter.ts
 *
 * Converts cx_message content blocks (from the database) into the format
 * the existing chat rendering pipeline understands.
 *
 * The rendering pipeline expects:
 *  - A flat `content: string` (markdown text, with `<thinking>` XML tags for thinking)
 *  - An optional `toolUpdates: ToolUpdateDisplay[]` array for tool call visualization
 *
 * This converter transforms structured CxContentBlock[] into those two pieces.
 */

import type {
    CxContentBlock,
    CxMessage,
    CxToolCall,
    CxTextContent,
    CxThinkingContent,
    CxMediaContent,
} from '../types/cx-tables';

// ============================================================================
// Types for the converter output
// ============================================================================

/** Tool update in the format ToolCallVisualization expects */
export interface ToolUpdateDisplay {
    id: string;
    type: 'mcp_input' | 'mcp_output' | 'mcp_error';
    mcp_input?: { name: string; arguments: Record<string, unknown> };
    mcp_output?: Record<string, unknown>;
    mcp_error?: string;
}

/** Result of converting a single message's content blocks */
export interface ConvertedMessageContent {
    /** Markdown string for the rendering pipeline (text + thinking in XML tags + media as markdown) */
    content: string;
    /** Tool call/result visualizations */
    toolUpdates: ToolUpdateDisplay[];
}

/** Result of processing a full conversation from the database */
export interface ProcessedChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    status: 'complete';
    timestamp: Date;
    toolUpdates: ToolUpdateDisplay[];
    /** Whether this message was condensed (out of context window) */
    isCondensed: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

/** Safely coerce a value into a Record<string, unknown>.
 *  - If it's already an object, return it directly (DB often stores jsonb objects, not strings).
 *  - If it's a JSON string, parse it.
 *  - Otherwise wrap the raw value.
 */
function toRecord(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return typeof parsed === 'object' && parsed !== null ? parsed : { value: parsed };
        } catch {
            return { raw: value };
        }
    }
    return { value };
}

// ============================================================================
// Single message content conversion
// ============================================================================

/**
 * Convert a single message's CxContentBlock[] array into display-ready format.
 *
 * - `text` blocks → joined as markdown
 * - `thinking` blocks → wrapped in `<thinking>` XML tags (content-splitter-v2 recognizes these)
 * - `media` blocks → markdown image syntax for images, links for others
 * - `tool_call` blocks → tool update objects for ToolCallVisualization
 * - `tool_result` blocks → paired tool update objects
 */
export function convertCxContentToDisplay(
    contentBlocks: CxContentBlock[] | unknown,
): ConvertedMessageContent {
    // Handle non-array input gracefully
    if (!Array.isArray(contentBlocks)) {
        const fallback = typeof contentBlocks === 'string' ? contentBlocks : '';
        return { content: fallback, toolUpdates: [] };
    }

    const parts: string[] = [];
    const toolUpdates: ToolUpdateDisplay[] = [];

    for (const block of contentBlocks) {
        if (!block || typeof block !== 'object' || !('type' in block)) {
            continue;
        }

        switch (block.type) {
            case 'text': {
                const textBlock = block as CxTextContent;
                if (textBlock.text) {
                    parts.push(textBlock.text);
                }
                break;
            }

            case 'thinking': {
                const thinkingBlock = block as CxThinkingContent;
                // Use text if available, otherwise use summary, otherwise show placeholder
                const thinkingText = thinkingBlock.text
                    || (thinkingBlock.summary && thinkingBlock.summary.length > 0
                        ? thinkingBlock.summary.join('\n')
                        : 'Thinking...');
                // Wrap in XML tags — content-splitter-v2 recognizes <thinking> and <think>
                parts.push(`<reasoning>\n${thinkingText}\n</reasoning>`);
                break;
            }

            case 'media': {
                const mediaBlock = block as CxMediaContent;
                if (!mediaBlock.url) break;

                switch (mediaBlock.kind) {
                    case 'image':
                        // Markdown image syntax — content-splitter-v2 recognizes this
                        parts.push(`![image](${mediaBlock.url})`);
                        break;
                    case 'video':
                        // Link with video indicator
                        parts.push(`[Video](${mediaBlock.url})`);
                        break;
                    case 'audio':
                        parts.push(`[Audio](${mediaBlock.url})`);
                        break;
                    case 'document':
                        parts.push(`[Document](${mediaBlock.url})`);
                        break;
                    default:
                        parts.push(`[Attachment](${mediaBlock.url})`);
                }
                break;
            }

            case 'tool_call': {
                // DB stores tool_call blocks with varying field names:
                //   Typed interface: { tool_call_id, name, arguments (string) }
                //   Actual DB data:  { id, name, arguments (object) }
                // Handle both shapes.
                const raw = block as Record<string, unknown>;
                const tcId = (raw.tool_call_id ?? raw.id ?? '') as string;
                const tcName = (raw.name ?? '') as string;
                const tcArgs = raw.arguments;

                toolUpdates.push({
                    id: tcId,
                    type: 'mcp_input',
                    mcp_input: {
                        name: tcName,
                        arguments: toRecord(tcArgs),
                    },
                });
                break;
            }

            case 'tool_result': {
                // DB stores tool_result blocks with varying field names:
                //   Typed interface: { tool_call_id, name, content (string), is_error }
                //   Actual DB data:  { tool_use_id, name, content (object), is_error? }
                // Handle both shapes.
                const raw = block as Record<string, unknown>;
                const trId = (raw.tool_call_id ?? raw.tool_use_id ?? '') as string;
                const isError = Boolean(raw.is_error);
                const trContent = raw.content;

                if (isError) {
                    toolUpdates.push({
                        id: trId,
                        type: 'mcp_error',
                        mcp_error: typeof trContent === 'string' ? trContent : JSON.stringify(trContent),
                    });
                } else {
                    // Wrap in { status, result } to match the streaming mcp_output shape
                    // that the tool renderers expect.
                    // Preserve the original content type — it can be a string, object,
                    // array, or any other JSON value. Don't force it into a Record;
                    // downstream renderers (GenericRenderer, custom renderers) already
                    // handle both string and object results.
                    const resultValue = (typeof trContent === 'object' && trContent !== null)
                        ? trContent
                        : trContent ?? null;
                    toolUpdates.push({
                        id: trId,
                        type: 'mcp_output',
                        mcp_output: {
                            status: 'success',
                            result: resultValue,
                        },
                    });
                }
                break;
            }

            default: {
                // Unknown block type — try to extract any text content
                const unknownBlock = block as Record<string, unknown>;
                if (typeof unknownBlock.text === 'string' && unknownBlock.text) {
                    parts.push(unknownBlock.text);
                }
            }
        }
    }

    return {
        content: parts.join('\n\n'),
        toolUpdates,
    };
}

// ============================================================================
// Build tool updates from cx_tool_call records
// ============================================================================

/**
 * Build ToolUpdateDisplay pairs (input + output) from a CxToolCall record.
 *
 * This is used for V2 tool-role messages where content is [] and the actual
 * tool data lives in the cx_tool_call table.
 */
function buildToolUpdatesFromToolCall(tc: CxToolCall): ToolUpdateDisplay[] {
    const updates: ToolUpdateDisplay[] = [];

    // Input (the tool call request)
    updates.push({
        id: tc.call_id,
        type: 'mcp_input',
        mcp_input: {
            name: tc.tool_name,
            arguments: tc.arguments,
        },
    });

    // Output or error (the tool call result)
    if (tc.is_error || !tc.success) {
        updates.push({
            id: tc.call_id,
            type: 'mcp_error',
            mcp_error: tc.error_message || tc.output || 'Tool execution failed',
        });
    } else if (tc.output != null) {
        let resultValue: unknown;
        if (tc.output_type === 'json') {
            try {
                resultValue = JSON.parse(tc.output);
            } catch {
                resultValue = tc.output;
            }
        } else {
            resultValue = tc.output;
        }

        updates.push({
            id: tc.call_id,
            type: 'mcp_output',
            mcp_output: {
                status: 'success',
                result: resultValue,
            },
        });
    }

    return updates;
}

// ============================================================================
// Full conversation processing
// ============================================================================

/**
 * Build a call_id → CxToolCall lookup map from an array of tool call records.
 */
export function buildToolCallMap(toolCalls: CxToolCall[]): Map<string, CxToolCall> {
    return new Map(toolCalls.map(tc => [tc.call_id, tc]));
}

/**
 * Build a message_id → CxToolCall[] lookup map for tool-role message resolution.
 */
function buildMessageToolCallMap(toolCalls: CxToolCall[]): Map<string, CxToolCall[]> {
    const map = new Map<string, CxToolCall[]>();
    for (const tc of toolCalls) {
        if (tc.message_id) {
            const existing = map.get(tc.message_id) || [];
            existing.push(tc);
            map.set(tc.message_id, existing);
        }
    }
    return map;
}

/**
 * Process an array of CxMessage rows from the database into display-ready ChatMessages.
 *
 * Handles:
 * - Converting all content block types
 * - Merging `tool`-role messages into the preceding assistant message
 * - V2: tool-role messages with empty content — resolved via cx_tool_call records
 * - Filtering out `summary` and `deleted` status messages
 * - Marking `condensed` messages
 *
 * @param dbMessages Messages ordered by position
 * @param toolCalls Optional array of CxToolCall records for the conversation.
 *   When provided, empty tool-role messages are resolved from these records.
 */
export function processDbMessagesForDisplay(
    dbMessages: CxMessage[],
    toolCalls?: CxToolCall[],
): ProcessedChatMessage[] {
    const result: ProcessedChatMessage[] = [];

    // Build lookup maps for tool call resolution
    const msgToolCallMap = toolCalls ? buildMessageToolCallMap(toolCalls) : null;
    const callIdToolCallMap = toolCalls ? buildToolCallMap(toolCalls) : null;

    for (const msg of dbMessages) {
        // Skip summary and deleted messages
        if (msg.status === 'summary' || msg.status === 'deleted') {
            continue;
        }

        const isCondensed = msg.status === 'condensed';

        if (msg.role === 'tool') {
            // V2: tool-role messages have content: [] — the actual tool output
            // lives in cx_tool_call and has already been enriched onto the
            // preceding assistant message (position 1) via callIdToolCallMap.
            // Only process tool-role messages in legacy mode (when they have
            // actual content blocks with tool_result data).
            const hasContent = Array.isArray(msg.content) && msg.content.length > 0;

            if (hasContent) {
                // Legacy: content blocks exist (tool_result blocks)
                const { toolUpdates } = convertCxContentToDisplay(msg.content);

                if (toolUpdates.length > 0) {
                    // Find the last assistant message to attach results to
                    for (let i = result.length - 1; i >= 0; i--) {
                        if (result[i].role === 'assistant') {
                            result[i].toolUpdates = [...result[i].toolUpdates, ...toolUpdates];
                            break;
                        }
                    }
                }
            }
            // V2 (empty content): skip — tool data is already on the assistant
            // message via the callIdToolCallMap enrichment below.
            continue;
        }

        // Process user / assistant / system messages
        const { content, toolUpdates } = convertCxContentToDisplay(msg.content);

        // For assistant messages with tool_call content blocks, enrich with
        // cx_tool_call output data so the full input+output is available.
        if (msg.role === 'assistant' && callIdToolCallMap && toolUpdates.length > 0) {
            // For each mcp_input tool update, check if we have a corresponding
            // cx_tool_call with output data and add the result.
            const enrichedUpdates = [...toolUpdates];
            for (const tu of toolUpdates) {
                if (tu.type === 'mcp_input') {
                    const tc = callIdToolCallMap.get(tu.id);
                    if (tc && tc.output != null) {
                        // Add the output entry from the tool call record
                        const outputUpdates = buildToolUpdatesFromToolCall(tc);
                        // Only add the output part (skip the duplicate input)
                        const outputOnly = outputUpdates.filter(u => u.type !== 'mcp_input');
                        enrichedUpdates.push(...outputOnly);
                    }
                }
            }
            // Replace with enriched set
            toolUpdates.length = 0;
            toolUpdates.push(...enrichedUpdates);
        }

        // Map role — treat any unexpected roles as 'assistant'
        const role: 'user' | 'assistant' | 'system' =
            msg.role === 'user' ? 'user'
                : msg.role === 'system' ? 'system'
                    : 'assistant';

        result.push({
            id: msg.id,
            role,
            content,
            status: 'complete',
            timestamp: new Date(msg.created_at),
            toolUpdates,
            isCondensed,
        });
    }

    return result;
}
