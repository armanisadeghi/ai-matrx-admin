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
 */

import { useCallback, useState } from "react";
import MarkdownStream from "@/components/MarkdownStream";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useDebugContext } from "@/hooks/useDebugContext";
import { selectErrorIsFatal } from "@/features/agents/redux/execution-system/active-requests/active-requests.selectors";
import {
  selectMessageById,
  extractFlatText,
} from "@/features/agents/redux/execution-system/messages/messages.selectors";
import { AssistantError } from "./AssistantError";
import { AssistantActionBar } from "@/features/agents/components/run/message-actions/AssistantActionBar";
import { RetryConfirmDialog } from "@/features/agents/components/run/message-actions/RetryConfirmDialog";
import { atomicRetry } from "@/features/agents/redux/execution-system/message-crud";
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

  const content = extractFlatText(record);

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

  return (
    <div ref={captureRef}>
      <MarkdownStream
        requestId={requestId}
        turnId={messageId}
        conversationId={conversationId}
        messageId={messageId ?? undefined}
        content={content}
        isStreamActive={isStreamActive}
        hideCopyButton={true}
        allowFullScreenEditor={false}
      />
      {!isStreamActive && messageId && (
        <AssistantActionBar
          content={content}
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
