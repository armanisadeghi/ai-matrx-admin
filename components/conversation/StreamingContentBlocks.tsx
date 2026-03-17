'use client';

import React, { useMemo, lazy, Suspense } from 'react';
import MarkdownStream from '@/components/MarkdownStream';
import { buildCanonicalBlocks, toolCallBlockToLegacy } from '@/lib/chat-protocol';
import type { ToolCallBlock } from '@/lib/chat-protocol';
import type { StreamEvent } from '@/types/python-generated/stream-events';

const ToolCallVisualization = lazy(() => import('@/components/conversation/ToolCallVisualization'));

interface StreamingContentBlocksProps {
    streamEvents: StreamEvent[];
    isStreaming: boolean;
}

/**
 * Renders interleaved text + tool blocks from NDJSON stream events in arrival order.
 *
 * Uses the canonical chat-protocol (buildCanonicalBlocks) to build an ordered list
 * of text and tool_call blocks. ToolCallBlock.phase drives spinner state so the UI
 * never gets stuck (no positional inference).
 *
 * Supports both active streaming (isStreaming=true) and replaying completed streams
 * from message.streamEvents (isStreaming=false).
 */
export function StreamingContentBlocks({ streamEvents, isStreaming }: StreamingContentBlocksProps) {
    const canonicalBlocks = useMemo(() => buildCanonicalBlocks(streamEvents), [streamEvents]);

    return (
        <>
            {canonicalBlocks.map((block, index) => {
                const isLastBlock = index === canonicalBlocks.length - 1;

                if (block.type === 'text') {
                    return (
                        <MarkdownStream
                            key={`stream-text-${index}`}
                            content={block.content}
                            type="message"
                            role="assistant"
                            isStreamActive={isLastBlock && isStreaming}
                            hideCopyButton={true}
                            allowFullScreenEditor={false}
                            className="text-xs bg-transparent"
                        />
                    );
                }

                if (block.type === 'tool_call') {
                    const toolBlock = block as ToolCallBlock;
                    const hasContentAfter = canonicalBlocks
                        .slice(index + 1)
                        .some((b) => b.type === 'text' && (b as { content: string }).content.trim());

                    const toolUpdates = toolCallBlockToLegacy(toolBlock);

                    return (
                        <Suspense key={`stream-tool-${toolBlock.callId}`} fallback={null}>
                            <ToolCallVisualization
                                toolUpdates={toolUpdates}
                                hasContent={hasContentAfter}
                                className="mb-2"
                            />
                        </Suspense>
                    );
                }

                return null;
            })}
        </>
    );
}

export default StreamingContentBlocks;
