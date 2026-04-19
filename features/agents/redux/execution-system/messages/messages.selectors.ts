/**
 * messages slice — selectors.
 *
 * Every selector reads from `byId + orderedIds`. There is no bridge to any
 * legacy turn shape — consumers receive `MessageRecord` (matching
 * `cx_message.Row`) and derive display text from `record.content`, which is
 * the authoritative `CxContentBlock[]` the server stores.
 */

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { MessageRecord } from "./messages.slice";
import type {
  ContentSegment,
  ContentSegmentText,
  ContentSegmentDbTool,
  ContentSegmentThinking,
} from "../active-requests/active-requests.selectors";
import type {
  ToolCallPart,
  MessagePart,
} from "@/types/python-generated/stream-events";
import type { CxContentBlock } from "@/features/public-chat/types/cx-tables";
import type { ApiEndpointMode } from "@/features/agents/types/instance.types";

const EMPTY_RECORDS: MessageRecord[] = [];
const EMPTY_IDS: string[] = [];
const EMPTY_SEGMENTS: ContentSegment[] = [];

// ---------------------------------------------------------------------------
// Core reads
// ---------------------------------------------------------------------------

/** Ordered `MessageRecord[]` for a conversation. */
export const selectConversationMessages = (conversationId: string) =>
  createSelector(
    (state: RootState) =>
      state.messages.byConversationId[conversationId]?.orderedIds,
    (state: RootState) => state.messages.byConversationId[conversationId]?.byId,
    (orderedIds, byId): MessageRecord[] => {
      if (!orderedIds || !byId || orderedIds.length === 0) return EMPTY_RECORDS;
      const out: MessageRecord[] = [];
      for (const id of orderedIds) {
        const rec = byId[id];
        if (rec) out.push(rec);
      }
      return out.length === 0 ? EMPTY_RECORDS : out;
    },
  );

export const selectOrderedMessageIds =
  (conversationId: string) =>
  (state: RootState): string[] =>
    state.messages.byConversationId[conversationId]?.orderedIds ?? EMPTY_IDS;

export const selectMessageById =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId];

export const selectMessageCount =
  (conversationId: string) =>
  (state: RootState): number =>
    state.messages.byConversationId[conversationId]?.orderedIds?.length ?? 0;

export const selectHasMessages =
  (conversationId: string) =>
  (state: RootState): boolean =>
    (state.messages.byConversationId[conversationId]?.orderedIds?.length ?? 0) >
    0;

// ---------------------------------------------------------------------------
// Narrow field selectors
//
// Heavy renderers (markdown, LaTeX, tool visualization) must NOT re-render
// when only a bookkeeping field changes. Subscribe through one of these
// per-field selectors instead of pulling the whole record.
// ---------------------------------------------------------------------------

export const selectMessageContent =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["content"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]?.content;

export const selectMessageStatus =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["status"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]?.status;

export const selectMessageClientStatus =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["_clientStatus"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]
      ?._clientStatus;

export const selectMessageRole =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["role"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]?.role;

export const selectMessagePosition =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["position"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]
      ?.position;

export const selectMessageAgentId =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["agentId"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]?.agentId;

export const selectMessageMetadata =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["metadata"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]
      ?.metadata;

export const selectMessageContentHistory =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["contentHistory"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]
      ?.contentHistory;

export const selectMessageStreamRequestId =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["_streamRequestId"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]
      ?._streamRequestId;

// ---------------------------------------------------------------------------
// Conversation-level fields
// ---------------------------------------------------------------------------

export const selectApiEndpointMode =
  (conversationId: string) =>
  (state: RootState): ApiEndpointMode =>
    state.messages.byConversationId[conversationId]?.apiEndpointMode ?? null;

export const selectConversationTitle =
  (conversationId: string) =>
  (state: RootState): string | null =>
    state.messages.byConversationId[conversationId]?.title ?? null;

export const selectConversationDescription =
  (conversationId: string) =>
  (state: RootState): string | null =>
    state.messages.byConversationId[conversationId]?.description ?? null;

export const selectConversationKeywords =
  (conversationId: string) =>
  (state: RootState): string[] | null =>
    state.messages.byConversationId[conversationId]?.keywords ?? null;

// ---------------------------------------------------------------------------
// Display helpers — derived view shapes for rendering
// ---------------------------------------------------------------------------

/**
 * Flat text extracted from a MessageRecord's content blocks. Used by
 * components that render plain-text previews (copy buttons, TTS, etc.).
 */
export function extractFlatText(record: MessageRecord | undefined): string {
  if (!record) return "";
  const blocks = Array.isArray(record.content)
    ? (record.content as Array<{ type?: string; text?: string }>)
    : [];
  let out = "";
  for (const b of blocks) {
    if (typeof b?.text === "string" && b.text.length > 0) {
      if (out.length > 0) out += "\n";
      out += b.text;
    }
  }
  return out;
}

/**
 * Returns the content blocks as `CxContentBlock[]` — the same shape the
 * server stores in `cx_message.content`.
 */
export function extractContentBlocks(
  record: MessageRecord | undefined,
): CxContentBlock[] {
  if (!record) return [];
  return Array.isArray(record.content)
    ? (record.content as unknown as CxContentBlock[])
    : [];
}

/**
 * Projects a `MessageRecord.content` array into the `ContentSegment[]`
 * structure the renderers consume — interleaving text, thinking, and tool
 * calls. Tool calls are joined to the observability slice by `callId` so
 * the rendered output includes the full arguments + result payloads.
 *
 * `role: "tool"` messages are stubs in the V2 DB shape — their results are
 * inlined onto the preceding assistant message's tool_call segments. The
 * selector emits no segments for those messages to avoid double rendering.
 */
export const selectMessageInterleavedContent = (
  conversationId: string,
  messageId: string,
) =>
  createSelector(
    (state: RootState) =>
      state.messages.byConversationId[conversationId]?.byId?.[messageId],
    (state: RootState) => state.observability.toolCalls,
    (record, toolCallsById): ContentSegment[] => {
      if (!record) return EMPTY_SEGMENTS;
      if ((record.role as string) === "tool") return EMPTY_SEGMENTS;

      const parts = Array.isArray(record.content)
        ? (record.content as unknown as MessagePart[])
        : [];
      if (parts.length === 0) return EMPTY_SEGMENTS;

      const toolCallByCallId = new Map<
        string,
        (typeof toolCallsById)[string]
      >();
      for (const key in toolCallsById) {
        const rec = toolCallsById[key];
        if (rec?.callId) toolCallByCallId.set(rec.callId, rec);
      }

      const segments: ContentSegment[] = [];
      for (const part of parts) {
        switch (part.type) {
          case "text": {
            const text = (part as { text?: string }).text;
            if (text) {
              segments.push({
                type: "text",
                content: text,
              } satisfies ContentSegmentText);
            }
            break;
          }
          case "thinking": {
            const text = (part as { text?: string }).text;
            if (text) {
              segments.push({
                type: "thinking",
                content: text,
              } satisfies ContentSegmentThinking);
            }
            break;
          }
          case "tool_call": {
            const tc = part as ToolCallPart;
            const callId = tc.id ?? "unknown";
            const toolCallRecord =
              callId !== "unknown" ? toolCallByCallId.get(callId) : undefined;

            const resolvedArguments =
              (toolCallRecord?.arguments as Record<string, unknown> | null) ??
              tc.arguments ??
              {};
            const resolvedResult =
              toolCallRecord?.outputPreview ?? toolCallRecord?.output ?? null;
            const resolvedIsError =
              toolCallRecord?.isError ??
              (toolCallRecord ? !toolCallRecord.success : false);

            segments.push({
              type: "db_tool",
              callId,
              toolName: toolCallRecord?.toolName ?? tc.name ?? "unknown_tool",
              arguments: resolvedArguments,
              result: resolvedResult,
              isError: resolvedIsError,
            } satisfies ContentSegmentDbTool);
            break;
          }
          case "tool_result":
          default:
            break;
        }
      }

      return segments.length === 0 ? EMPTY_SEGMENTS : segments;
    },
  );
