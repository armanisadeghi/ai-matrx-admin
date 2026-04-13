import { v4 as uuidv4 } from "uuid";
import type { ContentBlockPayload } from "@/types/python-generated/stream-events";

/**
 * Mapping from legacy DB "media" kind values to the canonical stream-protocol type.
 * Extend this map when new media kinds appear in the DB.
 */
const MEDIA_KIND_TO_BLOCK_TYPE: Record<string, string> = {
  audio: "audio_output",
  image: "image_output",
  video: "video_output",
  file: "file_output",
};

/**
 * Types that are already in ContentBlockPayload-compatible shape
 * (i.e. they came from the stream protocol and were persisted as-is).
 */
const KNOWN_STREAM_TYPES = new Set([
  "audio_output",
  "image_output",
  "video_output",
  "search_results",
  "search_error",
  "function_result",
  "workflow_step",
  "categorization_result",
  "fetch_results",
  "podcast_complete",
  "podcast_stage",
  "scrape_batch_complete",
  "structured_input_warning",
  "display_questionnaire",
  "unknown_data_event",
]);

/**
 * Block types stored in the DB `content` column that carry their main text
 * in a `text` field rather than `content`. Normalized with text → content
 * so BlockRenderer can read `block.content` uniformly.
 */
const TEXT_FIELD_BLOCK_TYPES = new Set(["thinking", "reasoning"]);

/**
 * User-input block types (attachments sent to the server).
 * Wrapped in ContentBlockPayload envelope with their original type preserved.
 */
const USER_INPUT_TYPES = new Set([
  "image",
  "audio",
  "video",
  "document",
  "youtube_video",
  "input_webpage",
  "input_notes",
  "input_task",
  "input_table",
  "input_list",
  "input_data",
]);

function isAlreadyNormalized(block: Record<string, unknown>): boolean {
  return (
    typeof block.blockId === "string" &&
    typeof block.blockIndex === "number" &&
    typeof block.type === "string" &&
    typeof block.status === "string"
  );
}

function normalizeSingle(
  raw: Record<string, unknown>,
  index: number,
): ContentBlockPayload {
  if (isAlreadyNormalized(raw)) {
    return raw as unknown as ContentBlockPayload;
  }

  const rawType = typeof raw.type === "string" ? raw.type : "";

  // Already a known stream-protocol type but missing structural fields
  if (KNOWN_STREAM_TYPES.has(rawType)) {
    return {
      blockId: (raw.blockId as string) ?? `db_${rawType}_${uuidv4()}`,
      blockIndex: (raw.blockIndex as number) ?? index,
      type: rawType,
      status: "complete",
      content: (raw.content as string | null) ?? null,
      data: (raw.data as Record<string, unknown> | null) ?? raw,
    };
  }

  // Legacy DB shape: { type: "media", kind: "audio", url, mime_type, ... }
  if (rawType === "media" && typeof raw.kind === "string") {
    const resolvedType =
      MEDIA_KIND_TO_BLOCK_TYPE[raw.kind] ?? "unknown_data_event";
    const { type: _t, kind: _k, ...rest } = raw;
    return {
      blockId: `db_${resolvedType}_${uuidv4()}`,
      blockIndex: index,
      type: resolvedType,
      status: "complete",
      content: null,
      data: { type: resolvedType, ...rest } as Record<string, unknown>,
    };
  }

  // DB blocks that carry their text payload in a `text` field (e.g. thinking, reasoning).
  // Move `text` → `content` so BlockRenderer reads it from the standard location.
  if (TEXT_FIELD_BLOCK_TYPES.has(rawType)) {
    const textContent = typeof raw.text === "string" ? raw.text : "";
    const { type: _t, text: _txt, ...rest } = raw;
    return {
      blockId: `db_${rawType}_${uuidv4()}`,
      blockIndex: index,
      type: rawType,
      status: "complete",
      content: textContent,
      data: rest as Record<string, unknown>,
    };
  }

  // User-input block types (attachments) — wrap in the envelope as-is
  if (USER_INPUT_TYPES.has(rawType)) {
    const { type: _t, ...rest } = raw;
    return {
      blockId: `input_${rawType}_${uuidv4()}`,
      blockIndex: index,
      type: rawType,
      status: "complete",
      content: null,
      data: rest as Record<string, unknown>,
    };
  }

  // Fallback: wrap any unrecognised block as unknown_data_event
  return {
    blockId: `db_unknown_${uuidv4()}`,
    blockIndex: index,
    type: "unknown_data_event",
    status: "complete",
    content: null,
    data: { ...raw, _dataType: rawType || "unknown" },
  };
}

/**
 * Normalizes an array of raw DB content blocks into the canonical
 * ContentBlockPayload shape used by the streaming pipeline.
 *
 * Call this at the Redux boundary — in thunks or reducers — so that
 * every consumer downstream sees a single type.
 */
export function normalizeContentBlocks(
  rawBlocks: Array<Record<string, unknown>>,
): ContentBlockPayload[] {
  return rawBlocks.map((block, i) => normalizeSingle(block, i));
}
