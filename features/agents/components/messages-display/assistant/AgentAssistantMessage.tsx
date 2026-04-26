"use client";

/**
 * AgentAssistantMessage
 *
 * Reads ONLY identifiers (requestId, messageId, conversationId) from props
 * and subscribes to its own data in Redux. No content flows through props
 * from the parent.
 *
 * Data resolution:
 *   1. requestId → activeRequests (live streaming bubble)
 *   2. messageId → messages.byId (DB-loaded or just-committed record)
 *
 * Streaming turn:    requestId is set, messageId is null.
 * Committed turn:    messageId is always set. requestId may also be set
 *                    while the ActiveRequest entry hasn't been cleaned up.
 * DB-loaded turn:    messageId is set, requestId is null.
 *
 * TOOL CALL DECOUPLING
 * --------------------
 * For persisted turns (isStreamActive=false, messageId set) this component
 * renders the message content as an ordered sequence of typed blocks rather
 * than flattening everything to a single markdown string.  When it encounters
 * a `tool_call` block it renders <PersistedToolCallCard> — a self-contained
 * component that fetches its own data from Redux and knows nothing about
 * the parent message renderer.  Text/thinking blocks are grouped and passed
 * to <MarkdownStream> as before.
 *
 * For live streaming the requestId-driven <MarkdownStream> path is unchanged.
 * Tool call visualisation during streaming is handled inside
 * StreamAwareChatMarkdown via <LiveToolCallCard>.
 */

import { useCallback, useMemo, useState } from "react";
import MarkdownStream from "@/components/MarkdownStream";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useDebugContext } from "@/hooks/useDebugContext";
import { selectErrorIsFatal } from "@/features/agents/redux/execution-system/active-requests/active-requests.selectors";
import {
  selectMessageById,
  extractFlatText,
} from "@/features/agents/redux/execution-system/messages/messages.selectors";
import { AssistantError } from "../../run/AssistantError";
import { AssistantActionBar } from "./AssistantActionBar";
import { RetryConfirmDialog } from "@/features/agents/components/messages-display/message-options/RetryConfirmDialog";
import { atomicRetry } from "@/features/agents/redux/execution-system/message-crud/atomic-retry.thunk";
import { PersistedToolCallCard } from "@/features/tool-call-visualization/components/PersistedToolCallCard";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";
import { useDomCapturePrint } from "@/features/conversation/hooks/useDomCapturePrint";

interface AgentAssistantMessageProps {
  conversationId: string;
  requestId?: string;
  /** Server-assigned `cx_message.id` — present for committed and DB-loaded turns. */
  messageId?: string;
  isStreamActive?: boolean;
  /**
   * Optional surface key for routing fork / retry outcomes via the
   * surfaces registry. Threaded down to AssistantActionBar.
   */
  surfaceKey?: string;
  compact?: boolean;
}

export function AgentAssistantMessage({
  conversationId,
  requestId,
  messageId,
  isStreamActive = false,
  surfaceKey,
  compact = false,
}: AgentAssistantMessageProps) {
  useDebugContext("AgentAssistantMessage");

  const dispatch = useAppDispatch();
  const [retryDialogOpen, setRetryDialogOpen] = useState(false);

  const { captureRef, isCapturing, captureAsPDF } = useDomCapturePrint();
  const handleFullPrint = useCallback(() => {
    captureAsPDF({
      filename: `agent-${conversationId}-${messageId ?? requestId ?? ""}`,
    });
  }, [captureAsPDF, conversationId, messageId, requestId]);

  const isFatalError = useAppSelector(
    requestId ? selectErrorIsFatal(requestId) : () => undefined,
  );

  const record = useAppSelector(
    messageId ? selectMessageById(conversationId, messageId) : () => undefined,
  );

  // Flat text is still needed by AssistantActionBar (copy, print, share).
  const flatText = extractFlatText(record);

  /**
   * For persisted (non-streaming) turns, split the content array into an
   * ordered sequence of typed render segments:
   *   - "text"      → a MarkdownStream with the accumulated text
   *   - "tool_call" → a PersistedToolCallCard that owns its own Redux reads
   *
   * Consecutive text/thinking blocks are merged into one markdown segment so
   * the layout matches what extractFlatText used to produce.
   *
   * During a live stream we ignore this and let MarkdownStream + its internal
   * StreamAwareChatMarkdown handle everything via the requestId / event path.
   */
  type TextSegment = { type: "text"; text: string };
  type ToolSegment = {
    type: "tool_call";
    callId: string;
    toolName: string;
    args: Record<string, unknown>;
  };
  type RenderSegment = TextSegment | ToolSegment;

  const renderSegments = useMemo((): RenderSegment[] => {
    // Only split blocks when showing a persisted (committed/DB-loaded) turn.
    if (!record?.content || !Array.isArray(record.content)) return [];

    const blocks = record.content as Array<{
      type?: string;
      text?: string;
      id?: string;
      name?: string;
      arguments?: unknown;
    }>;

    const segments: RenderSegment[] = [];
    let pendingText = "";

    const flushText = () => {
      const trimmed = pendingText.trim();
      if (trimmed) segments.push({ type: "text", text: trimmed });
      pendingText = "";
    };

    for (const block of blocks) {
      if (block.type === "tool_call") {
        flushText();
        const rawArgs = block.arguments;
        const args =
          rawArgs && typeof rawArgs === "object" && !Array.isArray(rawArgs)
            ? (rawArgs as Record<string, unknown>)
            : {};
        segments.push({
          type: "tool_call",
          callId: block.id ?? "",
          toolName: block.name ?? "unknown_tool",
          args,
        });
      } else if (typeof block.text === "string" && block.text.length > 0) {
        if (pendingText.length > 0) pendingText += "\n";
        pendingText += block.text;
      }
    }
    flushText();
    return segments;
  }, [record?.content]);

  // A retry is supported when we have an actual cx_message row to anchor on
  // (atomicRetry needs to truncate from a position, which requires the
  // failed message to be persisted). Live-stream errors before any
  // record_reserved event don't qualify; the user can just resend.
  const canRetry = Boolean(messageId);

  const handleRetry = useCallback(async () => {
    if (!messageId) return;
    try {
      await dispatch(
        atomicRetry({
          conversationId,
          failedMessageId: messageId,
        }),
      ).unwrap();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err && "message" in err
            ? String((err as { message?: string }).message)
            : "Retry failed";
      toast.error(message);
    }
  }, [dispatch, conversationId, messageId]);

  if (isFatalError) {
    return (
      <div className="flex flex-col gap-2 mt-1">
        <AssistantError error="An error occurred during streaming." />
        {canRetry && (
          <div className="ml-10">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setRetryDialogOpen(true)}
            >
              <RotateCw className="w-3.5 h-3.5" />
              Retry from scratch
            </Button>
          </div>
        )}
        {messageId && (
          <RetryConfirmDialog
            open={retryDialogOpen}
            onOpenChange={setRetryDialogOpen}
            failedMessageId={messageId}
            onConfirm={handleRetry}
          />
        )}
      </div>
    );
  }

  /**
   * Persisted turn with known content blocks: render each segment in order.
   * Tool call blocks become self-contained PersistedToolCallCards; text blocks
   * go to MarkdownStream exactly as before.
   *
   * We stay on the old single-MarkdownStream path when:
   *   - The stream is still active (requestId drives the display)
   *   - There are no segments (empty message or record not yet loaded)
   *   - The message only contains text (no tool_call blocks) — in that case
   *     renderSegments has exactly one TextSegment, same as before
   */
  const hasToolCallBlocks = renderSegments.some((s) => s.type === "tool_call");

  if (!isStreamActive && messageId && hasToolCallBlocks) {
    return (
      <div ref={captureRef}>
        {renderSegments.map((segment, i) => {
          if (segment.type === "tool_call") {
            return (
              <PersistedToolCallCard
                key={segment.callId || i}
                callId={segment.callId}
                toolName={segment.toolName}
                arguments={segment.args}
              />
            );
          }
          return (
            <MarkdownStream
              key={i}
              requestId={undefined}
              turnId={messageId}
              conversationId={conversationId}
              messageId={messageId}
              content={segment.text}
              isStreamActive={false}
              hideCopyButton={true}
              allowFullScreenEditor={false}
            />
          );
        })}
        <AssistantActionBar
          content={flatText}
          messageId={messageId}
          conversationId={conversationId}
          metadata={
            record?.metadata
              ? (record.metadata as Record<string, unknown>)
              : null
          }
          onFullPrint={handleFullPrint}
          isCapturing={isCapturing}
          surfaceKey={surfaceKey}
        />
      </div>
    );
  }

  return (
    <div ref={captureRef}>
      <MarkdownStream
        requestId={requestId}
        turnId={messageId}
        conversationId={conversationId}
        messageId={messageId ?? undefined}
        content={flatText}
        isStreamActive={isStreamActive}
        hideCopyButton={true}
        allowFullScreenEditor={false}
      />
      {!isStreamActive && messageId && (
        <AssistantActionBar
          content={flatText}
          messageId={messageId}
          conversationId={conversationId}
          metadata={
            record?.metadata
              ? (record.metadata as Record<string, unknown>)
              : null
          }
          onFullPrint={handleFullPrint}
          isCapturing={isCapturing}
          surfaceKey={surfaceKey}
        />
      )}
    </div>
  );
}
