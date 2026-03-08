/**
 * lib/chat-protocol/adapters.ts
 *
 * Bridges between CanonicalMessage and the legacy ChatMessage / ToolCallObject
 * types that existing renderers consume.
 *
 * MOTIVATION
 * ──────────
 * The canonical format is the long-term target; legacy formats are consumed
 * by existing renderers that cannot all be updated simultaneously.
 * These adapters let migration happen incrementally:
 *   1. Normalize to canonical immediately (one place).
 *   2. Adapt to legacy for existing renderers (this file).
 *   3. Remove adapters one by one as renderers are upgraded.
 *
 * DESIGN
 * ──────
 * • Zero platform deps — pure TypeScript.
 * • One-way only: canonical → legacy (not the reverse — old formats are inputs,
 *   canonical is the output of normalizers).
 * • Clearly marked @deprecated — signal intent to remove.
 */

import type { CanonicalMessage, CanonicalBlock, ToolCallBlock } from './types';

// ============================================================================
// LEGACY TOOL CALL OBJECT (matches lib/api/tool-call.types.ts)
// ============================================================================

export interface LegacyMcpInput {
    name: string;
    arguments?: Record<string, unknown>;
}

export interface LegacyToolCallObject {
    id?: string;
    type: 'mcp_input' | 'mcp_output' | 'mcp_error' | 'step_data' | 'user_message' | 'user_visible_message';
    mcp_input?:  LegacyMcpInput;
    mcp_output?: Record<string, unknown>;
    mcp_error?:  string;
    user_message?: string;
}

// ============================================================================
// CANONICAL TOOL BLOCK → LEGACY ToolCallObject[]
// ============================================================================

/**
 * Convert a CanonicalToolCallBlock into the legacy ToolCallObject[] pair
 * (mcp_input + mcp_output or mcp_error) expected by ToolCallVisualization.
 *
 * @deprecated Use CanonicalBlock directly once renderers are upgraded.
 */
export function toolCallBlockToLegacy(block: ToolCallBlock): LegacyToolCallObject[] {
    const updates: LegacyToolCallObject[] = [];

    updates.push({
        id:        block.callId,
        type:      'mcp_input',
        mcp_input: {
            name:      block.input.name,
            arguments: block.input.arguments as Record<string, unknown>,
        },
    });

    if (block.output) {
        updates.push({
            id:         block.callId,
            type:       'mcp_output',
            mcp_output: { status: block.output.status, result: block.output.result } as Record<string, unknown>,
        });
    } else if (block.error) {
        updates.push({
            id:        block.callId,
            type:      'mcp_error',
            mcp_error: block.error.message,
        });
    }

    // Progress messages (streaming only) become user_message updates
    for (const p of block.progress) {
        updates.push({
            id:           block.callId,
            type:         'user_message',
            user_message: p.message,
        });
    }

    return updates;
}

// ============================================================================
// CANONICAL MESSAGE → LEGACY ChatMessage
// ============================================================================

/**
 * Legacy ChatMessage shape (matches features/public-chat/context/ChatContext.tsx).
 *
 * @deprecated Target type for during-migration adapting only.
 */
export interface LegacyChatMessage {
    id:          string;
    role:        'user' | 'assistant' | 'system';
    content:     string;
    timestamp:   Date;
    status:      'pending' | 'sending' | 'streaming' | 'complete' | 'error';
    toolUpdates?: LegacyToolCallObject[];
    isCondensed?: boolean;
    resources?:  unknown[];
    variables?:  Record<string, unknown>;
}

/**
 * Convert a CanonicalMessage into the legacy ChatMessage format.
 *
 * Text and thinking blocks are joined into a single markdown string.
 * ToolCallBlocks are expanded into LegacyToolCallObject pairs.
 * Media blocks are rendered as markdown image/link syntax.
 *
 * @deprecated Use CanonicalMessage directly once renderers are upgraded.
 */
export function canonicalToLegacy(msg: CanonicalMessage): LegacyChatMessage {
    const textParts:       string[]                 = [];
    const toolUpdates:     LegacyToolCallObject[]   = [];

    for (const block of msg.blocks) {
        switch (block.type) {
            case 'text': {
                textParts.push(block.content);
                break;
            }
            case 'thinking': {
                // Wrap in <reasoning> XML tags — the markdown renderer recognises these
                textParts.push(`<reasoning>\n${block.content}\n</reasoning>`);
                break;
            }
            case 'media': {
                if (block.kind === 'image') {
                    textParts.push(`![image](${block.url})`);
                } else {
                    const label = block.kind.charAt(0).toUpperCase() + block.kind.slice(1);
                    textParts.push(`[${label}](${block.url})`);
                }
                break;
            }
            case 'tool_call': {
                toolUpdates.push(...toolCallBlockToLegacy(block));
                break;
            }
            case 'error': {
                textParts.push(`> ⚠️ ${block.message}`);
                break;
            }
        }
    }

    return {
        id:          msg.id,
        role:        msg.role,
        content:     textParts.join('\n\n'),
        timestamp:   msg.timestamp,
        status:      msg.status === 'streaming' ? 'streaming' : 'complete',
        isCondensed: msg.isCondensed,
        ...(toolUpdates.length > 0 ? { toolUpdates } : {}),
    };
}

/**
 * Convert an array of CanonicalMessages into legacy ChatMessages.
 *
 * @deprecated Use CanonicalMessage[] directly once renderers are upgraded.
 */
export function canonicalArrayToLegacy(messages: CanonicalMessage[]): LegacyChatMessage[] {
    return messages.map(canonicalToLegacy);
}
