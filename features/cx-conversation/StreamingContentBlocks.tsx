"use client";

/**
 * StreamingContentBlocks — compatibility shim
 *
 * This component previously managed interleaved text + tool_call rendering
 * by calling buildCanonicalBlocks externally and splitting the result into
 * separate MarkdownStream / ToolCallVisualization pairs.
 *
 * That logic now lives inside MarkdownStream (via StreamAwareChatMarkdown),
 * which accepts the same `events` prop and renders text + tool blocks in
 * correct arrival order internally.
 *
 * Pass <MarkdownStream events={streamEvents} isStreamActive={isStreaming} />
 * instead. This shim is kept only for backward compatibility.
 */

import React from "react";
import MarkdownStream from "@/components/MarkdownStream";
import type { StreamEvent } from "@/types/python-generated/stream-events";

interface StreamingContentBlocksProps {
  streamEvents: StreamEvent[];
  isStreaming: boolean;
}

export function StreamingContentBlocks({
  streamEvents,
  isStreaming,
}: StreamingContentBlocksProps) {
  return (
    <MarkdownStream
      events={streamEvents}
      type="message"
      role="assistant"
      isStreamActive={isStreaming}
      hideCopyButton={true}
      allowFullScreenEditor={false}
      className="text-xs bg-transparent"
    />
  );
}

export default StreamingContentBlocks;
