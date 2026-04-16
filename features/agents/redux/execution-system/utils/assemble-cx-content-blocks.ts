/**
 * assembleMessageParts
 *
 * Converts a completed ActiveRequest into CxContentBlock[] — the canonical
 * format stored in cx_message.content[] in the database.
 *
 * This is the inverse of normalizeContentBlocks (DB → RenderBlockPayload[]).
 * Call this once at the end of a stream, right before commitAssistantTurn,
 * while the ActiveRequest data is still in Redux.
 *
 * Ordering is driven by the timeline so reasoning → tool calls → text blocks
 * appear in the exact sequence the model produced them, not in insertion order.
 *
 * Block mapping:
 *   timeline "reasoning_start/end" → CxThinkingContent (from accumulatedReasoning slices)
 *   timeline "tool_event" started  → CxToolCallContent (from toolLifecycle)
 *   timeline "tool_event" completed → CxToolResultContent (from toolLifecycle)
 *   timeline "text_start/end"      → CxTextContent (from renderBlocks in that range)
 *   renderBlocks with type "media" / audio_output / image_output / video_output
 *                                  → CxMediaContent (if not covered by timeline)
 */

import type { ActiveRequest } from "@/features/agents/types/request.types";
import type {
  CxContentBlock,
  CxTextContent,
  CxThinkingContent,
  CxToolCallContent,
  CxToolResultContent,
  CxMediaContent,
} from "@/features/public-chat/types/cx-tables";
import type {
  TimelineEntry,
  TimelineTextEnd,
  TimelineReasoningEnd,
  TimelineToolEvent,
} from "@/features/agents/types/request.types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isReasoningEnd(e: TimelineEntry): e is TimelineReasoningEnd {
  return e.kind === "reasoning_end";
}

function isTextEnd(e: TimelineEntry): e is TimelineTextEnd {
  return e.kind === "text_end";
}

function isToolEvent(e: TimelineEntry): e is TimelineToolEvent {
  return e.kind === "tool_event";
}

const MEDIA_BLOCK_TYPES = new Set([
  "media",
  "audio_output",
  "image_output",
  "video_output",
  "file_output",
]);

function renderBlockTypeToMediaKind(
  type: string,
): "image" | "audio" | "video" | "document" {
  if (type === "image_output") return "image";
  if (type === "audio_output") return "audio";
  if (type === "video_output") return "video";
  return "document";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assembles the canonical CxContentBlock[] from a completed ActiveRequest.
 *
 * Returns an empty array for requests with no meaningful content (errors,
 * aborts, or streams that produced nothing).
 */
export function assembleMessageParts(request: ActiveRequest): CxContentBlock[] {
  const blocks: CxContentBlock[] = [];

  // Track which renderBlock indices have been consumed by timeline text runs
  // so the fallback pass at the end doesn't double-emit them.
  const consumedRenderBlockIndices = new Set<number>();

  // Track tool callIds already emitted (tool_result events reference them)
  const emittedToolCallIds = new Set<string>();

  // ── Pass 1: Walk the timeline in order ──────────────────────────────────
  for (const entry of request.timeline) {
    // ── Reasoning run ended → emit CxThinkingContent ──────────────────────
    if (isReasoningEnd(entry)) {
      const reasoningChunks = request.reasoningChunks.slice(
        entry.chunkStartIndex,
        entry.chunkEndIndex,
      );
      const text = reasoningChunks.join("");
      if (text.trim()) {
        const thinkingBlock: CxThinkingContent = {
          type: "thinking",
          text,
        };
        blocks.push(thinkingBlock);
      }
      continue;
    }

    // ── Text run ended → emit CxTextContent for each renderBlock in range ─
    if (isTextEnd(entry)) {
      const rangeIds = request.renderBlockOrder.slice(
        entry.blockStartIndex,
        entry.blockEndIndex,
      );
      const textParts: string[] = [];

      for (let i = entry.blockStartIndex; i < entry.blockEndIndex; i++) {
        consumedRenderBlockIndices.add(i);
      }

      for (const blockId of rangeIds) {
        const block = request.renderBlocks[blockId];
        if (!block) continue;

        if (MEDIA_BLOCK_TYPES.has(block.type)) {
          // Flush any accumulated text first
          if (textParts.length > 0) {
            const joined = textParts.join("").trim();
            if (joined) {
              blocks.push({ type: "text", text: joined } as CxTextContent);
            }
            textParts.length = 0;
          }
          // Emit media block
          const mediaBlock = renderBlockToMediaBlock(block);
          if (mediaBlock) blocks.push(mediaBlock);
        } else if (block.content) {
          textParts.push(block.content);
        }
      }

      if (textParts.length > 0) {
        const joined = textParts.join("").trim();
        if (joined) {
          blocks.push({ type: "text", text: joined } as CxTextContent);
        }
      }
      continue;
    }

    // ── Tool event ─────────────────────────────────────────────────────────
    if (isToolEvent(entry)) {
      const lifecycle = request.toolLifecycle[entry.callId];
      if (!lifecycle) continue;

      if (
        entry.subEvent === "started" &&
        !emittedToolCallIds.has(entry.callId)
      ) {
        emittedToolCallIds.add(entry.callId);
        const toolCallBlock: CxToolCallContent = {
          type: "tool_call",
          id: lifecycle.callId,
          name: lifecycle.toolName,
          arguments: lifecycle.arguments,
        };
        blocks.push(toolCallBlock);
      }

      if (
        entry.subEvent === "completed" &&
        lifecycle.status === "completed" &&
        lifecycle.result !== undefined &&
        lifecycle.result !== null
      ) {
        const toolResultBlock: CxToolResultContent = {
          type: "tool_result",
          call_id: lifecycle.callId,
          name: lifecycle.toolName,
          content: lifecycle.result,
          is_error: false,
        };
        blocks.push(toolResultBlock);
      }

      if (entry.subEvent === "error") {
        const toolResultBlock: CxToolResultContent = {
          type: "tool_result",
          call_id: lifecycle.callId,
          name: lifecycle.toolName,
          content: lifecycle.errorMessage ?? "Tool error",
          is_error: true,
        };
        blocks.push(toolResultBlock);
      }
    }
  }

  // ── Pass 2: Emit any renderBlocks not covered by timeline text runs ──────
  // This catches blocks from streams that had no text_start/end timeline entries
  // (e.g., pure data-event streams, or streams processed with older event formats).
  for (let i = 0; i < request.renderBlockOrder.length; i++) {
    if (consumedRenderBlockIndices.has(i)) continue;

    const blockId = request.renderBlockOrder[i];
    const block = request.renderBlocks[blockId];
    if (!block) continue;

    if (MEDIA_BLOCK_TYPES.has(block.type)) {
      const mediaBlock = renderBlockToMediaBlock(block);
      if (mediaBlock) blocks.push(mediaBlock);
    } else if (block.content?.trim()) {
      blocks.push({ type: "text", text: block.content } as CxTextContent);
    }
  }

  return blocks;
}

function renderBlockToMediaBlock(block: {
  type: string;
  data?: Record<string, unknown> | null;
}): CxMediaContent | null {
  const data = block.data ?? {};
  const url =
    typeof data.url === "string"
      ? data.url
      : typeof data.file_url === "string"
        ? data.file_url
        : undefined;
  const mimeType =
    typeof data.mime_type === "string" ? data.mime_type : undefined;

  if (!url && !mimeType) return null;

  return {
    type: "media",
    kind: renderBlockTypeToMediaKind(block.type),
    url,
    mime_type: mimeType,
    metadata: Object.fromEntries(
      Object.entries(data).filter(([k]) => k !== "url" && k !== "mime_type"),
    ),
  };
}
