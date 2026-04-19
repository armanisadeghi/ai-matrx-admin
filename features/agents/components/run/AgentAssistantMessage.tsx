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

import { useCallback } from "react";
import MarkdownStream from "@/components/MarkdownStream";
import { useAppSelector } from "@/lib/redux/hooks";
import { useDebugContext } from "@/hooks/useDebugContext";
import { selectErrorIsFatal } from "@/features/agents/redux/execution-system/active-requests/active-requests.selectors";
import {
  selectMessageById,
  extractFlatText,
} from "@/features/agents/redux/execution-system/messages/messages.selectors";
import { AssistantError } from "./AssistantError";
import { AssistantActionBar } from "@/features/agents/components/run/message-actions/AssistantActionBar";
import { useDomCapturePrint } from "@/features/conversation/hooks/useDomCapturePrint";

interface AgentAssistantMessageProps {
  conversationId: string;
  requestId?: string;
  /** Server-assigned `cx_message.id` — present for committed and DB-loaded turns. */
  messageId?: string;
  isStreamActive?: boolean;
  compact?: boolean;
}

export function AgentAssistantMessage({
  conversationId,
  requestId,
  messageId,
  isStreamActive = false,
  compact = false,
}: AgentAssistantMessageProps) {
  useDebugContext("AgentAssistantMessage");

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

  if (isFatalError) {
    return <AssistantError error="An error occurred during streaming." />;
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
        />
      )}
    </div>
  );
}
