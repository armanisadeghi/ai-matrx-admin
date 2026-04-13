"use client";
import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import {
  EnhancedChatMarkdownInternal,
  ChatMarkdownDisplayProps,
  MarkdownErrorBoundary,
} from "./EnhancedChatMarkdown";
import { StreamEvent } from "./types";
import {
  buildCanonicalBlocks,
  toolCallBlockToLegacy,
} from "@/lib/chat-protocol";
import type {
  ToolCallBlock,
  CanonicalBlock,
  TextBlock,
} from "@/lib/chat-protocol";
import { parseNdjsonStream } from "@/lib/api/stream-parser";

const ToolCallVisualization = lazy(
  () => import("@/features/cx-conversation/ToolCallVisualization"),
);

// ---------------------------------------------------------------------------
// Server-processed block state — used when backend sends render_block events
// ---------------------------------------------------------------------------

interface ProcessedBlockState {
  blockId: string;
  blockIndex: number;
  type: string;
  status: "streaming" | "complete" | "error";
  content?: string | null;
  data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

/**
 * Extended props that include stream event handling
 */
export interface StreamAwareChatMarkdownProps extends Omit<
  ChatMarkdownDisplayProps,
  "content"
> {
  /**
   * Direct content (legacy mode - used when not using events)
   */
  content?: string;

  /** Turn ID for DB-loaded turn rendering */
  turnId?: string;
  /** Conversation ID for DB-loaded turn rendering */
  conversationId?: string;

  /**
   * Array of stream events to process (new mode)
   * When provided, this takes precedence over content prop
   */
  events?: StreamEvent[];

  /**
   * Callback when an error event is received
   */
  onError?: (error: string) => void;

  /**
   * Callback when phase events are received
   */
  onPhaseUpdate?: (phase: string) => void;

  /**
   * Pre-processed blocks from the server (new render_block protocol).
   * When present and non-empty, the component skips client-side parsing
   * and renders these blocks directly.
   */
  serverProcessedBlocks?: ProcessedBlockState[];
}

/**
 * Stream-aware wrapper for EnhancedChatMarkdown
 *
 * Supports two modes:
 * 1. Legacy mode: Pass `content` directly (works with existing Redux/Socket.io)
 * 2. Event mode: Pass `events` array (new unified API)
 *
 * In event mode, text and tool_call blocks are rendered in arrival order using
 * buildCanonicalBlocks. This ensures tool calls appear inline at the exact
 * position they were emitted relative to surrounding text — not pinned to the
 * top of the message.
 */
export const StreamAwareChatMarkdown: React.FC<
  StreamAwareChatMarkdownProps
> = ({
  requestId,
  turnId,
  conversationId,
  content,
  events,
  onError,
  onPhaseUpdate,
  serverProcessedBlocks: serverBlocksProp,
  ...restProps
}) => {
  const [processedContent, setProcessedContent] = useState<string>(
    content || "",
  );
  const [hasStreamError, setHasStreamError] = useState(false);

  // Ordered canonical blocks derived from events (text + tool_call interleaved)
  const [canonicalBlocks, setCanonicalBlocks] = useState<CanonicalBlock[]>([]);

  // Server-processed blocks state (new render_block protocol)
  const [serverBlocks, setServerBlocks] = useState<ProcessedBlockState[]>([]);
  const serverBlockMapRef = React.useRef<Map<string, ProcessedBlockState>>(
    new Map(),
  );
  const isNewProtocolRef = React.useRef(false);

  // Use refs to always have the latest callbacks without triggering rerenders
  const onErrorRef = React.useRef(onError);
  const onPhaseUpdateRef = React.useRef(onPhaseUpdate);

  // Track which events we've already processed (by index)
  const lastProcessedIndexRef = React.useRef(-1);

  // Accumulate text content in a ref to avoid reprocessing all chunks
  const accumulatedContentRef = React.useRef("");
  // Track whether tool events or blocks changed since last RAF flush
  const canonicalBlocksChangedRef = React.useRef(false);
  // Always point to the latest events array so RAF callback can access most-current state
  const eventsRef = React.useRef<StreamEvent[] | undefined>(events);

  // Throttle state updates using RAF to batch rapid chunks
  const rafIdRef = React.useRef<number | null>(null);
  const pendingContentUpdateRef = React.useRef(false);
  const pendingCanonicalUpdateRef = React.useRef(false);
  const pendingBlocksUpdateRef = React.useRef(false);

  useEffect(() => {
    onErrorRef.current = onError;
    onPhaseUpdateRef.current = onPhaseUpdate;
  }, [onError, onPhaseUpdate]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Keep eventsRef current so the RAF callback always processes the latest events
  useEffect(() => {
    eventsRef.current = events;
  });

  // Process ONLY new events (delta processing for efficiency)
  useEffect(() => {
    if (!events || events.length === 0) {
      // Legacy mode - just use the content prop directly
      if (content !== undefined && content !== accumulatedContentRef.current) {
        setProcessedContent(content);
        accumulatedContentRef.current = content;
        lastProcessedIndexRef.current = -1;
        canonicalBlocksChangedRef.current = false;
      }
      return;
    }

    // Check if this is a new stream (events were cleared/reset)
    if (events.length <= lastProcessedIndexRef.current) {
      lastProcessedIndexRef.current = -1;
      accumulatedContentRef.current = "";
      canonicalBlocksChangedRef.current = false;
    }

    // Process only the delta (new events since last render)
    const startIndex = lastProcessedIndexRef.current + 1;
    if (startIndex >= events.length) return;

    let hasNewContent = false;
    let hasNewCanonical = false;
    let hasNewBlocks = false;

    for (let i = startIndex; i < events.length; i++) {
      const event = events[i];

      switch (event.event) {
        case "chunk": {
          const chunkData = event.data as unknown as { text: string };
          accumulatedContentRef.current += chunkData.text;
          hasNewContent = true;
          // Text chunks also change canonical blocks (the text block grows)
          canonicalBlocksChangedRef.current = true;
          hasNewCanonical = true;
          break;
        }

        case "tool_event": {
          console.log(
            "[STREAM] tool_event:",
            JSON.stringify(event.data, null, 2),
          );
          // Tool events change canonical blocks (new/updated tool_call block)
          canonicalBlocksChangedRef.current = true;
          hasNewCanonical = true;
          break;
        }

        case "error": {
          console.log("[STREAM] error:", JSON.stringify(event.data, null, 2));
          const errorData = event.data as Record<string, unknown>;
          const errorMessage =
            (errorData?.user_message as string) ||
            (errorData?.message as string) ||
            "An error occurred";
          onErrorRef.current?.(errorMessage);
          setHasStreamError(true);
          break;
        }

        case "phase": {
          console.log("[STREAM] phase:", JSON.stringify(event.data, null, 2));
          const phaseData = event.data as Record<string, unknown>;
          console.log("[STREAM] phase:", JSON.stringify(phaseData, null, 2));
          onPhaseUpdateRef.current?.(phaseData?.phase as string);
          break;
        }

        case "render_block": {
          console.log(
            "[STREAM] render_block:",
            JSON.stringify(event.data, null, 2),
          );
          // New server-processed block protocol.
          // The Python backend sends snake_case keys (block_id, block_index);
          // RenderBlockPayload uses camelCase. Normalise both forms so we
          // work whether the payload has been transformed or not.
          isNewProtocolRef.current = true;
          const raw = event.data as unknown as Record<string, unknown>;
          const blockId = (raw.blockId ?? raw.block_id) as string | undefined;
          const blockIndex = (raw.blockIndex ?? raw.block_index) as
            | number
            | undefined;
          if (blockId !== undefined) {
            serverBlockMapRef.current.set(blockId, {
              blockId,
              blockIndex: blockIndex ?? 0,
              type: raw.type as string,
              status:
                (raw.status as "streaming" | "complete" | "error") ??
                "streaming",
              content: (raw.content as string | null) ?? null,
              data: (raw.data as Record<string, unknown> | null) ?? null,
              metadata: (raw.metadata as Record<string, unknown>) ?? {},
            });
            hasNewBlocks = true;
          }
          break;
        }

        case "completion":
          console.log(
            "[STREAM] completion:",
            JSON.stringify(event.data, null, 2),
          );
          break;
        case "heartbeat":
          console.log(
            "[STREAM] heartbeat:",
            JSON.stringify(event.data, null, 2),
          );
          break;
        case "data":
          console.log("[STREAM] data:", JSON.stringify(event.data, null, 2));
          break;
        case "broker":
          console.log("[STREAM] broker:", JSON.stringify(event.data, null, 2));
          break;
        case "end":
          console.log("[STREAM] end:", JSON.stringify(event.data, null, 2));
          break;

        default:
          console.log(
            "[STREAM] ⚠️ UNKNOWN event type:",
            event.event,
            JSON.stringify(event.data, null, 2),
          );
      }
    }

    lastProcessedIndexRef.current = events.length - 1;

    if (hasNewContent) pendingContentUpdateRef.current = true;
    if (hasNewCanonical) pendingCanonicalUpdateRef.current = true;
    if (hasNewBlocks) pendingBlocksUpdateRef.current = true;

    // Batch state updates using RAF — only schedule if not already scheduled
    if (
      (hasNewContent || hasNewCanonical || hasNewBlocks) &&
      rafIdRef.current === null
    ) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;

        if (pendingContentUpdateRef.current) {
          setProcessedContent(accumulatedContentRef.current);
          pendingContentUpdateRef.current = false;
        }
        if (
          pendingCanonicalUpdateRef.current &&
          canonicalBlocksChangedRef.current
        ) {
          // Build ordered canonical blocks from the full event set at flush time
          const currentEvents = eventsRef.current;
          if (currentEvents) {
            setCanonicalBlocks(buildCanonicalBlocks(currentEvents as any));
          }
          canonicalBlocksChangedRef.current = false;
          pendingCanonicalUpdateRef.current = false;
        }
        if (pendingBlocksUpdateRef.current) {
          // Convert map to sorted array for rendering
          const blockArray = Array.from(
            serverBlockMapRef.current.values(),
          ).sort((a, b) => a.blockIndex - b.blockIndex);
          setServerBlocks(blockArray);
          pendingBlocksUpdateRef.current = false;
        }
      });
    }
  }, [events, content]);

  // Determine if we're using events or legacy mode
  const isEventMode = events && events.length > 0;

  // In event mode: check whether any tool_call blocks are in the canonical list.
  // If not, we can take the fast path (single EnhancedChatMarkdownInternal).
  const hasToolBlocks =
    isEventMode && canonicalBlocks.some((b) => b.type === "tool_call");

  // Merge server blocks from prop and from events
  const effectiveServerBlocks =
    serverBlocksProp ?? (isNewProtocolRef.current ? serverBlocks : undefined);

  // ── Event mode with tool calls: render interleaved segments in arrival order ──
  if (isEventMode && hasToolBlocks) {
    return (
      <>
        {canonicalBlocks.map((block, index) => {
          const isLastBlock = index === canonicalBlocks.length - 1;

          if (block.type === "text") {
            const textBlock = block as TextBlock;
            return (
              <EnhancedChatMarkdownInternal
                requestId={requestId}
                turnId={turnId}
                conversationId={conversationId}
                key={`text-${index}`}
                {...restProps}
                content={textBlock.content}
                isStreamActive={isLastBlock ? restProps.isStreamActive : false}
                serverProcessedBlocks={
                  isLastBlock ? effectiveServerBlocks : undefined
                }
              />
            );
          }

          if (block.type === "tool_call") {
            const toolBlock = block as ToolCallBlock;
            const hasContentAfter = canonicalBlocks
              .slice(index + 1)
              .some(
                (b) => b.type === "text" && (b as TextBlock).content.trim(),
              );
            const toolUpdates = toolCallBlockToLegacy(toolBlock);

            return (
              <MarkdownErrorBoundary
                key={`tool-${toolBlock.callId}`}
                fallback={null}
                onError={(error) =>
                  console.error(
                    "[MarkdownStream] ToolCallVisualization error:",
                    error,
                  )
                }
              >
                <Suspense fallback={null}>
                  <ToolCallVisualization
                    toolUpdates={toolUpdates}
                    hasContent={hasContentAfter}
                    className="mb-2"
                  />
                </Suspense>
              </MarkdownErrorBoundary>
            );
          }

          return null;
        })}
      </>
    );
  }

  // ── Legacy mode or event mode with no tool calls: single renderer ──
  return (
    <EnhancedChatMarkdownInternal
      {...restProps}
      requestId={requestId}
      turnId={turnId}
      conversationId={conversationId}
      content={processedContent}
      serverProcessedBlocks={effectiveServerBlocks}
    />
  );
};

/**
 * Hook to accumulate stream events from a fetch response
 * Useful for the unified-chat test page
 */
export const useStreamEvents = () => {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const processStream = useCallback(async (response: Response) => {
    if (!response.body) {
      throw new Error("No response body");
    }

    setIsStreaming(true);
    setEvents([]);

    try {
      const { events: streamEvents } = parseNdjsonStream(response);
      for await (const event of streamEvents) {
        setEvents((prev) => [...prev, event as unknown as StreamEvent]);
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const reset = useCallback(() => {
    setEvents([]);
    setIsStreaming(false);
  }, []);

  return {
    events,
    isStreaming,
    processStream,
    reset,
  };
};

export default StreamAwareChatMarkdown;
