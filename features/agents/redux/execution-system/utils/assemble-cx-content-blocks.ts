/**
 * assembleMessageParts
 *
 * Converts a completed ActiveRequest into CxContentBlock[] — the canonical
 * format stored in cx_message.content[] in the database.
 *
 * This is the inverse of normalizeContentBlocks (DB → RenderBlockPayload[]).
 * Call this once at the end of a stream, right before the final
 * `updateMessageRecord` lands for the assistant message, while the
 * ActiveRequest data is still in Redux.
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

/**
 * Wraps a non-text render block's content back into the markdown shape it
 * was streamed in, so the committed `CxTextContent.text` parses into the
 * same typed block on reload.
 *
 * Only used on the fallback path — when `text_end.rawText` is missing (pure
 * `render_block`-event streams, or reasoning-only runs). The preferred path
 * uses the raw chunk text stored on the timeline entry and never enters
 * here.
 */
function reconstructBlockMarkdown(block: {
  type: string;
  content: string | null;
  data?: Record<string, unknown> | null;
}): string {
  const content = block.content ?? "";
  const data = block.data ?? {};

  switch (block.type) {
    case "text":
      return content;
    case "code": {
      const language =
        typeof data.language === "string" ? data.language : "";
      return `\`\`\`${language}\n${content}\n\`\`\``;
    }
    case "reasoning":
    case "thinking":
      return `<thinking>\n${content}\n</thinking>`;
    case "artifact":
    case "decision": {
      const attrs = Object.entries(data)
        .filter(([k, v]) => k !== "content" && typeof v !== "object")
        .map(([k, v]) => ` ${k}="${String(v).replace(/"/g, "&quot;")}"`)
        .join("");
      return `<${block.type}${attrs}>\n${content}\n</${block.type}>`;
    }
    // XML-tagged blocks (task, flashcards, timeline, etc.) — wrap with the
    // matching tag so the reload parser re-detects the structured block.
    case "task":
    case "database":
    case "private":
    case "plan":
    case "event":
    case "tool":
    case "questionnaire":
    case "flashcards":
    case "cooking_recipe":
    case "timeline":
    case "progress_tracker":
    case "troubleshooting":
    case "resources":
    case "research":
    case "info":
      return `<${block.type}>\n${content}\n</${block.type}>`;
    default:
      // Unknown types fall back to content — may lose structure but text
      // survives. Server-side render_block streams with novel types
      // should either extend this switch or move to chunk streaming.
      return content;
  }
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
    // DATA CONTRACT: store the joined reasoning chunks verbatim. We skip
    // empty runs (nothing to render) but never alter whitespace.
    if (isReasoningEnd(entry)) {
      const reasoningChunks = request.reasoningChunks.slice(
        entry.chunkStartIndex,
        entry.chunkEndIndex,
      );
      const text = reasoningChunks.join("");
      if (text.length > 0) {
        const thinkingBlock: CxThinkingContent = {
          type: "thinking",
          text,
        };
        blocks.push(thinkingBlock);
      }
      continue;
    }

    // ── Text run ended → emit CxTextContent from the raw chunk text ─────
    // The timeline entry carries the exact markdown emitted by the model
    // (fences, pipes, XML tags, etc.) — committing that verbatim is the
    // only way code/table/XML-tagged blocks round-trip through the DB and
    // re-parse into typed render blocks on reload. The block accumulator
    // strips those structural markers when building typed render blocks,
    // so reading from `renderBlocks[].content` would write de-fenced
    // plain text into `cx_message.content` and the post-stream renderer
    // would show code as text.
    if (isTextEnd(entry)) {
      for (let i = entry.blockStartIndex; i < entry.blockEndIndex; i++) {
        consumedRenderBlockIndices.add(i);
      }

      // DATA CONTRACT: NEVER mutate text. The committed CxTextContent
      // receives `rawText` byte-for-byte. `rawText.length > 0` is the
      // only guard — we skip empty runs but do not strip whitespace, do
      // not normalize, do not trim, do not collapse.
      const rawText = entry.rawText;
      if (rawText && rawText.length > 0) {
        blocks.push({ type: "text", text: rawText } as CxTextContent);

        // Still emit any media blocks that landed in this text run —
        // media arrives as a dedicated render_block event, not via
        // chunk text, so it isn't in `rawText`.
        const rangeIds = request.renderBlockOrder.slice(
          entry.blockStartIndex,
          entry.blockEndIndex,
        );
        for (const blockId of rangeIds) {
          const block = request.renderBlocks[blockId];
          if (!block) continue;
          if (MEDIA_BLOCK_TYPES.has(block.type)) {
            const mediaBlock = renderBlockToMediaBlock(block);
            if (mediaBlock) blocks.push(mediaBlock);
          }
        }
        continue;
      }

      // Fallback for entries missing `rawText` (render_block-event streams
      // with no chunks, or reasoning-only runs): reconstruct markdown
      // from the typed render blocks so code/table/XML-tagged blocks
      // re-parse into the same typed blocks on reload. Each reconstructed
      // fragment is pushed verbatim — the only separator between
      // non-adjacent fragments is `\n\n`, never a trim.
      const rangeIds = request.renderBlockOrder.slice(
        entry.blockStartIndex,
        entry.blockEndIndex,
      );
      const textParts: string[] = [];
      for (const blockId of rangeIds) {
        const block = request.renderBlocks[blockId];
        if (!block) continue;
        if (MEDIA_BLOCK_TYPES.has(block.type)) {
          if (textParts.length > 0) {
            const joined = textParts.join("\n\n");
            if (joined.length > 0) {
              blocks.push({ type: "text", text: joined } as CxTextContent);
            }
            textParts.length = 0;
          }
          const mediaBlock = renderBlockToMediaBlock(block);
          if (mediaBlock) blocks.push(mediaBlock);
        } else {
          const reconstructed = reconstructBlockMarkdown({
            type: block.type,
            content: block.content ?? null,
            data: block.data ?? null,
          });
          if (reconstructed.length > 0) textParts.push(reconstructed);
        }
      }
      if (textParts.length > 0) {
        const joined = textParts.join("\n\n");
        if (joined.length > 0) {
          blocks.push({ type: "text", text: joined } as CxTextContent);
        }
      }
      continue;
    }

    // ── Tool event ─────────────────────────────────────────────────────────
    // Timeline entries carry the server's `tool_started` / `tool_completed`
    // / `tool_error` sub-events verbatim (see process-stream `tool_event`
    // dispatch — `subEvent: toolData.event`). Match on that exact wire
    // form. Previously this check used the unprefixed `"started"`/etc.
    // strings and silently dropped every tool block from the committed
    // `cx_message.content`, which is why tools disappeared when a stream
    // ended.
    if (isToolEvent(entry)) {
      const lifecycle = request.toolLifecycle[entry.callId];
      if (!lifecycle) continue;

      if (
        entry.subEvent === "tool_started" &&
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
        entry.subEvent === "tool_completed" &&
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

      if (entry.subEvent === "tool_error") {
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
    } else if (typeof block.content === "string" && block.content.length > 0) {
      // DATA CONTRACT: the reconstructed markdown is pushed verbatim. We
      // only skip a completely empty reconstruction; no trim, no collapse.
      const reconstructed = reconstructBlockMarkdown({
        type: block.type,
        content: block.content,
        data: block.data ?? null,
      });
      if (reconstructed.length > 0) {
        blocks.push({ type: "text", text: reconstructed } as CxTextContent);
      }
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
