"use client";

/**
 * AgentAssistantMessage
 *
 * Reads ONLY identifiers (requestId, messageId, conversationId) from props
 * and subscribes to its own data in Redux. No content flows through props
 * from the parent.
 *
 * Data resolution:
 *   - messageId → messages.byId joined with observability.toolCalls via the
 *     canonical selector `selectMessageInterleavedContent`. Returns
 *     `ContentSegment[]` with text/thinking/db_tool segments fully
 *     populated — no per-component reshape.
 *   - requestId → activeRequests, used only by the streaming bubble path
 *     (no messageId yet). Phase 6 retires this path entirely once the stream
 *     writes content directly to messages.byId.
 *
 * Streaming turn:    requestId is set, messageId may be null.
 * Committed turn:    messageId is set; content rendered via canonical selector.
 * DB-loaded turn:    messageId is set; same render path as committed.
 *
 * TOOL CALLS
 * ----------
 * Tool calls render via the single `<ToolCallCard>` component, which is
 * pure presentational — all data joining happens in
 * `selectMessageInterleavedContent`. No more LiveToolCallCard /
 * InlineToolCard / PersistedToolCallCard split.
 */

import { useCallback, useState } from "react";
import MarkdownStream from "@/components/MarkdownStream";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useDebugContext } from "@/hooks/useDebugContext";
import { selectErrorIsFatal } from "@/features/agents/redux/execution-system/active-requests/active-requests.selectors";
import {
  selectMessageById,
  selectMessageInterleavedContent,
  extractFlatText,
} from "@/features/agents/redux/execution-system/messages/messages.selectors";
import { selectHideToolResults } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { AssistantError } from "../../run/AssistantError";
import { AssistantActionBar } from "./AssistantActionBar";
import { RetryConfirmDialog } from "@/features/agents/components/messages-display/message-options/RetryConfirmDialog";
import { atomicRetry } from "@/features/agents/redux/execution-system/message-crud/atomic-retry.thunk";
import { ToolCallCard } from "@/features/tool-call-visualization/components/ToolCallCard";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";
import { useDomCapturePrint } from "@/features/conversation/hooks/useDomCapturePrint";
import type { ContentSegment } from "@/features/agents/redux/execution-system/active-requests/active-requests.selectors";

const EMPTY_SEGMENTS: ContentSegment[] = [];

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

  // Canonical content view — joined with observability.toolCalls. Single
  // source of truth for any committed message (live stream still uses the
  // requestId-driven path until Phase 6 wires content into messages.byId
  // during the stream).
  const segments = useAppSelector(
    messageId && conversationId
      ? selectMessageInterleavedContent(conversationId, messageId)
      : () => EMPTY_SEGMENTS,
  );

  const hideToolResults = useAppSelector(selectHideToolResults(conversationId));

  // Flat text is still needed by AssistantActionBar (copy, print, share).
  const flatText = extractFlatText(record);

  // A retry is supported when we have an actual cx_message row to anchor on.
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

  // Persisted (committed or DB-loaded) turn: render from the canonical
  // selector. The same selector handles tool result joining; we just
  // walk segments in order and render each.
  const hasToolSegments = segments.some((s) => s.type === "db_tool");

  if (!isStreamActive && messageId && hasToolSegments) {
    // Walk segments. Adjacent text/thinking are batched into one
    // MarkdownStream so consecutive prose renders as one flowing block.
    type Plan =
      | { kind: "text"; key: string; content: string }
      | {
          kind: "tool";
          key: string;
          callId: string;
          toolName: string;
          arguments: Record<string, unknown>;
          result: unknown;
          isError: boolean;
        };

    const plan: Plan[] = [];
    let pendingText = "";
    let pendingTextKey = 0;

    const flushText = () => {
      const trimmed = pendingText.trim();
      if (trimmed) {
        plan.push({
          kind: "text",
          key: `t-${pendingTextKey}`,
          content: trimmed,
        });
        pendingTextKey++;
      }
      pendingText = "";
    };

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.type === "text" || seg.type === "thinking") {
        if (pendingText.length > 0) pendingText += "\n";
        pendingText += seg.content;
      } else if (seg.type === "db_tool") {
        flushText();
        plan.push({
          kind: "tool",
          key: `tool-${seg.callId || i}`,
          callId: seg.callId,
          toolName: seg.toolName,
          arguments: seg.arguments,
          result: seg.result,
          isError: seg.isError,
        });
      }
    }
    flushText();

    return (
      <div ref={captureRef}>
        {plan.map((item) => {
          if (item.kind === "tool") {
            if (hideToolResults) return null;
            return (
              <ToolCallCard
                key={item.key}
                callId={item.callId}
                toolName={item.toolName}
                arguments={item.arguments}
                result={item.result}
                isError={item.isError}
                requestId={requestId}
              />
            );
          }
          return (
            <MarkdownStream
              key={item.key}
              requestId={undefined}
              turnId={messageId}
              conversationId={conversationId}
              messageId={messageId}
              content={item.content}
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

  // Streaming bubble OR text-only persisted message: single MarkdownStream.
  // Phase 6 will replace the streaming path here with reads from messages.byId
  // (incrementally written by process-stream during the stream).
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
