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
// Full conversation processing
// ============================================================================

/**
 * Process an array of CxMessage rows from the database into display-ready ChatMessages.
 *
 * Handles:
 * - Converting all content block types
 * - Merging `tool`-role messages into the preceding assistant message
 * - Filtering out `summary` and `deleted` status messages
 * - Marking `condensed` messages
 */
export function processDbMessagesForDisplay(dbMessages: CxMessage[]): ProcessedChatMessage[] {
    const result: ProcessedChatMessage[] = [];

    for (const msg of dbMessages) {
        // Skip summary and deleted messages
        if (msg.status === 'summary' || msg.status === 'deleted') {
            continue;
        }

        const isCondensed = msg.status === 'condensed';

        if (msg.role === 'tool') {
            // Tool-role messages contain tool_result blocks.
            // Merge their tool results into the preceding assistant message.
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
            continue;
        }

        // Process user / assistant / system messages
        const { content, toolUpdates } = convertCxContentToDisplay(msg.content);

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
