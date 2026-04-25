/**
 * atomicRetry — "Retry this turn from scratch" after a failed agent run.
 *
 * Failure scenarios this handles:
 *   • Stream errored mid-generation (partial assistant message persisted).
 *   • Tool execution failed and the assistant message was marked failed.
 *   • Network blip during a long turn.
 *
 * The "atomic" in the name = we discard everything from the failed turn and
 * resubmit the original user message verbatim. The Python team is building
 * a smarter "resume from last good step" path — see PYTHON_RESUME_SPEC.md.
 * Until that ships, this is the only retry option, and it's safe in every
 * scenario because it doesn't try to merge partial state.
 *
 * Flow:
 *   1. Find the failed assistant message (caller provides its id).
 *   2. Walk back through `orderedIds` to the most recent user message at
 *      a position less than the failed message — that's what we'll resend.
 *   3. Truncate every message from the failed message onward (atomic RPC
 *      if available, fallback to per-message soft-delete otherwise — same
 *      pattern as overwriteAndResend).
 *   4. Mark cache-bypass + invalidate server cache so the next call rebuilds
 *      cleanly.
 *   5. Reload the conversation bundle so the messages slice mirrors DB.
 *   6. Set the input bar text to the original user message and dispatch
 *      `executeInstance`. Stream begins.
 *
 * Edge cases:
 *   • No prior user message (system-only conversation): rejects. Caller
 *     should disable the Retry button when this would happen.
 *   • Assistant message has multimodal user input upstream: we currently
 *     re-extract flat text only. Multimodal resubmit is a follow-up.
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "@/utils/supabase/client";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import { extractFlatText } from "../messages/messages.selectors";
import { markCacheBypass } from "./cache-bypass.slice";
import { invalidateConversationCache } from "./invalidate-conversation-cache.thunk";
import { setUserInputText } from "../instance-user-input/instance-user-input.slice";
import { executeInstance } from "../thunks/execute-instance.thunk";
import { loadConversation } from "../thunks/load-conversation.thunk";

interface AtomicRetryArgs {
  conversationId: string;
  /** The failed assistant message id (or the partial one). */
  failedMessageId: string;
}

interface AtomicRetryResult {
  conversationId: string;
  resubmittedFromMessageId: string;
  truncatedMessageIds: string[];
}

interface ThunkApi {
  dispatch: AppDispatch;
  state: RootState;
  rejectValue: { message: string };
}

export const atomicRetry = createAsyncThunk<
  AtomicRetryResult,
  AtomicRetryArgs,
  ThunkApi
>(
  "messages/atomicRetry",
  async (
    { conversationId, failedMessageId },
    { dispatch, getState, rejectWithValue },
  ) => {
    const state = getState();
    const messagesEntry = state.messages.byConversationId[conversationId];
    const failedMessage = messagesEntry?.byId?.[failedMessageId];

    if (!failedMessage) {
      return rejectWithValue({
        message: `Failed message ${failedMessageId} not found`,
      });
    }

    // Walk backwards from the failed message to find the most recent user
    // message. That's the one we'll resubmit.
    const ordered = (messagesEntry?.orderedIds ?? [])
      .map((id) => messagesEntry!.byId[id])
      .filter(Boolean);

    const failedIdx = ordered.findIndex((m) => m.id === failedMessageId);
    if (failedIdx < 0) {
      return rejectWithValue({
        message: "Failed message not found in ordered transcript",
      });
    }

    let triggeringUserMessage: typeof failedMessage | undefined;
    for (let i = failedIdx - 1; i >= 0; i--) {
      const candidate = ordered[i];
      if (candidate.role === "user" && !candidate.deletedAt) {
        triggeringUserMessage = candidate;
        break;
      }
    }

    if (!triggeringUserMessage) {
      return rejectWithValue({
        message:
          "No user message precedes the failed turn — nothing to resubmit",
      });
    }

    const userText = extractFlatText(triggeringUserMessage);
    if (!userText) {
      return rejectWithValue({
        message:
          "Triggering user message has no text content — atomic retry can only resubmit text turns. Use Edit & Resubmit for multimodal content.",
      });
    }

    // Collect every message id from the failed message onward (inclusive).
    const failedPosition = failedMessage.position;
    const truncationTargets = ordered
      .filter((m) => m.position >= failedPosition && !m.deletedAt)
      .map((m) => m.id);

    // ── Truncate via atomic RPC if available, else fall back ──────────────
    // We pass `p_after_position = failedPosition - 1` so the RPC kills the
    // failed message itself. (Truncate-after deletes everything > N; we
    // want >= failedPosition.)
    let truncatedIds: string[] = [];
    // RPC name is cast because the Python-side function is documented in
    // PYTHON_RESUME_SPEC.md but not yet deployed — the auto-generated
    // database types don't include it. The runtime fallback below
    // handles the "function does not exist" response gracefully.
    const { error: truncErr } = await supabase.rpc(
      "cx_truncate_conversation_after" as never,
      {
        p_conversation_id: conversationId,
        p_after_position: Math.max(0, failedPosition - 1),
      } as never,
    );

    if (truncErr) {
      const code = (truncErr as { code?: string }).code ?? "";
      const isFunctionMissing =
        code === "PGRST202" ||
        /function .*does not exist/i.test(truncErr.message ?? "");

      if (!isFunctionMissing) {
        // eslint-disable-next-line no-console
        console.error(
          "[atomicRetry] cx_truncate_conversation_after failed:",
          truncErr,
        );
        return rejectWithValue({
          message:
            truncErr.message ??
            "Failed to clear the failed turn before retry",
        });
      }

      // Fallback — per-message soft-delete.
      // eslint-disable-next-line no-console
      console.warn(
        "[atomicRetry] cx_truncate_conversation_after RPC missing — falling back to per-message soft-delete",
      );
      for (const id of truncationTargets) {
        const { error } = await supabase.rpc(
          "cx_message_soft_delete" as never,
          { p_message_id: id } as never,
        );
        if (error) {
          // eslint-disable-next-line no-console
          console.error(
            "[atomicRetry] fallback delete failed",
            { id },
            error,
          );
          return rejectWithValue({
            message: `Failed to soft-delete message ${id} during retry cleanup`,
          });
        }
        truncatedIds.push(id);
      }
    } else {
      truncatedIds = truncationTargets;
    }

    // ── Cache invalidation ────────────────────────────────────────────────
    dispatch(markCacheBypass({ conversationId, conversation: true }));
    void dispatch(invalidateConversationCache({ conversationId }));

    // ── Re-hydrate so the messages slice matches the truncated DB ────────
    try {
      await dispatch(loadConversation({ conversationId })).unwrap();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        "[atomicRetry] loadConversation after truncate failed",
        err,
      );
      // Continue — the messages slice will catch up on the next stream's
      // record_reserved events.
    }

    // ── Resubmit the original user input ──────────────────────────────────
    dispatch(
      setUserInputText({
        conversationId,
        text: userText,
      }),
    );
    void dispatch(executeInstance({ conversationId }));

    return {
      conversationId,
      resubmittedFromMessageId: triggeringUserMessage.id,
      truncatedMessageIds: truncatedIds,
    };
  },
);
