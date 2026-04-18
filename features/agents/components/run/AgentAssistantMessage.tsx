"use client";

/**
 * AgentAssistantMessage
 *
 * ID-ONLY DESIGN: This component receives only identifiers (requestId, turnId,
 * conversationId) and subscribes to its own data in Redux. No content flows
 * through props from the parent.
 *
 * Data resolution priority:
 *   1. requestId → activeRequests (live streaming or recently committed)
 *   2. turnId → instanceConversationHistory (DB-loaded or committed fallback)
 *
 * For the streaming turn: requestId is set, turnId is null.
 * For committed turns:    requestId may be set (if ActiveRequest still in store),
 *                         turnId is always set.
 * For DB-loaded turns:    requestId is null, turnId is set.
 */

import { useCallback } from "react";
import MarkdownStream from "@/components/MarkdownStream";
import { useAppSelector } from "@/lib/redux/hooks";
import { useDebugContext } from "@/hooks/useDebugContext";
import { selectErrorIsFatal } from "@/features/agents/redux/execution-system/active-requests/active-requests.selectors";
import { selectTurnByTurnId } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import { AssistantError } from "./AssistantError";
import { AssistantActionBar } from "@/features/cx-conversation/AssistantActionBar";
import { useDomCapturePrint } from "@/features/conversation/hooks/useDomCapturePrint";

interface AgentAssistantMessageProps {
  conversationId: string;
  requestId?: string;
  turnId?: string;
  isStreamActive?: boolean;
  compact?: boolean;
}

export function AgentAssistantMessage({
  conversationId,
  requestId,
  turnId,
  isStreamActive = false,
  compact = false,
}: AgentAssistantMessageProps) {
  useDebugContext("AgentAssistantMessage");

  // DOM-capture print (Tier 2 — captures all rendered blocks)
  const { captureRef, isCapturing, captureAsPDF } = useDomCapturePrint();
  const handleFullPrint = useCallback(() => {
    captureAsPDF({
      filename: `agent-${conversationId}-${turnId ?? requestId ?? ""}`,
    });
  }, [captureAsPDF, conversationId, turnId, requestId]);

  // ── Data Resolution ──────────────────────────────────────────────────────
  // Priority: activeRequest (live/recent) → committed turn (DB/history)

  const isFatalError = useAppSelector(
    requestId ? selectErrorIsFatal(requestId) : () => undefined,
  );

  const turn = useAppSelector(
    turnId ? selectTurnByTurnId(conversationId, turnId) : () => undefined,
  );

  if (isFatalError) {
    return <AssistantError error="An error occurred during streaming." />;
  }

  return (
    <div ref={captureRef}>
      <MarkdownStream
        requestId={requestId}
        turnId={turnId}
        conversationId={conversationId}
        content={turn?.content ?? ""}
        isStreamActive={isStreamActive}
        hideCopyButton={true}
        allowFullScreenEditor={false}
      />
      {!isStreamActive && (
        <AssistantActionBar
          content={turn?.content ?? ""}
          messageId={turnId ?? requestId ?? ""}
          conversationId={conversationId}
          onFullPrint={handleFullPrint}
          isCapturing={isCapturing}
        />
      )}

      {isFatalError && (
        <AssistantError
          error={turn?.errorMessage ?? "An error occurred during streaming."}
        />
      )}
    </div>
  );
}
