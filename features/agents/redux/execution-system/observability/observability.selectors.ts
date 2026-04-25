import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type {
  CxUserRequestRecord,
  CxRequestRecord,
  CxToolCallRecord,
  ObservabilityUserRequestTimeline,
} from "./observability.slice";

const EMPTY_STRING_ARRAY: string[] = [];
const EMPTY_USER_REQUESTS: CxUserRequestRecord[] = [];
const EMPTY_REQUESTS: CxRequestRecord[] = [];
const EMPTY_TOOL_CALLS: CxToolCallRecord[] = [];

// ---------------------------------------------------------------------------
// User requests
// ---------------------------------------------------------------------------

export const selectUserRequestIdsForConversation =
  (conversationId: string) =>
  (state: RootState): string[] =>
    state.observability.userRequestsByConversationId[conversationId] ??
    EMPTY_STRING_ARRAY;

export const selectUserRequestsForConversation = (conversationId: string) =>
  createSelector(
    (state: RootState) =>
      state.observability.userRequestsByConversationId[conversationId],
    (state: RootState) => state.observability.userRequests,
    (ids, byId): CxUserRequestRecord[] => {
      if (!ids || ids.length === 0) return EMPTY_USER_REQUESTS;
      const out: CxUserRequestRecord[] = [];
      for (const id of ids) {
        const rec = byId[id];
        if (rec) out.push(rec);
      }
      return out.length === 0 ? EMPTY_USER_REQUESTS : out;
    },
  );

export const selectUserRequestById =
  (userRequestId: string) =>
  (state: RootState): CxUserRequestRecord | undefined =>
    state.observability.userRequests[userRequestId];

// ---------------------------------------------------------------------------
// LLM requests (cx_request)
// ---------------------------------------------------------------------------

export const selectRequestsForUserRequest = (userRequestId: string) =>
  createSelector(
    (state: RootState) =>
      state.observability.requestsByUserRequestId[userRequestId],
    (state: RootState) => state.observability.requests,
    (ids, byId): CxRequestRecord[] => {
      if (!ids || ids.length === 0) return EMPTY_REQUESTS;
      const out: CxRequestRecord[] = [];
      for (const id of ids) {
        const rec = byId[id];
        if (rec) out.push(rec);
      }
      return out.length === 0 ? EMPTY_REQUESTS : out;
    },
  );

// ---------------------------------------------------------------------------
// Tool calls (cx_tool_call)
// ---------------------------------------------------------------------------

export const selectToolCallsForUserRequest = (userRequestId: string) =>
  createSelector(
    (state: RootState) =>
      state.observability.toolCallsByUserRequestId[userRequestId],
    (state: RootState) => state.observability.toolCalls,
    (ids, byId): CxToolCallRecord[] => {
      if (!ids || ids.length === 0) return EMPTY_TOOL_CALLS;
      const out: CxToolCallRecord[] = [];
      for (const id of ids) {
        const rec = byId[id];
        if (rec) out.push(rec);
      }
      return out.length === 0 ? EMPTY_TOOL_CALLS : out;
    },
  );

export const selectToolCallById =
  (id: string) =>
  (state: RootState): CxToolCallRecord | undefined =>
    state.observability.toolCalls[id];

/**
 * Tool calls attached to a specific cx_message — used by destructive
 * actions (delete, retry) to warn the user about cascaded deletions.
 * Returns only non-soft-deleted rows.
 */
export const selectToolCallsForMessage = (messageId: string) =>
  createSelector(
    (state: RootState) => state.observability.toolCalls,
    (byId): CxToolCallRecord[] => {
      const out: CxToolCallRecord[] = [];
      for (const id in byId) {
        const rec = byId[id];
        if (rec.messageId === messageId && !rec.deletedAt) {
          out.push(rec);
        }
      }
      return out.length === 0 ? EMPTY_TOOL_CALLS : out;
    },
  );

// ---------------------------------------------------------------------------
// Timelines
// ---------------------------------------------------------------------------

export const selectTimelineForUserRequest =
  (userRequestId: string) =>
  (state: RootState): ObservabilityUserRequestTimeline | undefined =>
    state.observability.timelines[userRequestId];
