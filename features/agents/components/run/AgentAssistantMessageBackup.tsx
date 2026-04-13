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

import { useState, useRef, useCallback, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { useDomCapturePrint } from "@/features/chat/hooks/useDomCapturePrint";
import MarkdownStream from "@/components/MarkdownStream";
import { AssistantActionBar } from "@/features/cx-conversation/AssistantActionBar";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { useDebugContext } from "@/hooks/useDebugContext";
import { upsertAssistantMarkdownDraft } from "@/features/agents/redux/agent-assistant-markdown-draft.slice";
import {
  selectAccumulatedText,
  selectRequestStatus,
  selectAllRenderBlocks,
} from "@/features/agents/redux/execution-system/active-requests/active-requests.selectors";
import { selectTurnByTurnId } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import { AgentToolDisplay } from "./AgentToolDisplay";
import type { RenderBlockPayload } from "@/types/python-generated/stream-events";

const EMPTY_BLOCKS: RenderBlockPayload[] = [];

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
  const dispatch = useAppDispatch();
  const { publish: publishDebug, isActive: isDebugPublishing } =
    useDebugContext("AgentAssistantMessage");

  // ── Data Resolution ──────────────────────────────────────────────────────
  // Priority: activeRequest (live/recent) → committed turn (DB/history)

  const requestText = useAppSelector(
    requestId ? selectAccumulatedText(requestId) : () => "",
  );
  const requestStatus = useAppSelector(
    requestId ? selectRequestStatus(requestId) : () => undefined,
  );

  const activeRequestBlocks = useAppSelector(
    requestId ? selectAllRenderBlocks(requestId) : () => EMPTY_BLOCKS,
  );

  const turn = useAppSelector(
    turnId ? selectTurnByTurnId(conversationId, turnId) : () => undefined,
  );

  const content = requestText || turn?.content || "";
  const error =
    requestStatus === "error"
      ? (turn?.errorMessage ?? "An error occurred during streaming.")
      : (turn?.errorMessage ?? null);

  // Both sources are already RenderBlockPayload[] — prefer active request
  // (live/recently committed), fall back to turn blocks (DB-loaded).
  const mergedBlocks =
    activeRequestBlocks.length > 0
      ? activeRequestBlocks
      : (turn?.renderBlocks ?? EMPTY_BLOCKS);

  const serverProcessedBlocks =
    mergedBlocks.length > 0 ? mergedBlocks : undefined;

  // ── Debug ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isDebugPublishing) return;
    const preview =
      content.length <= 200 ? content : `${content.slice(0, 200)}…`;
    publishDebug({
      "Conversation ID": conversationId,
      "Request ID": requestId ?? "—",
      "Turn ID": turnId ?? "—",
      "Stream Active": isStreamActive,
      Compact: compact,
      "Content Length": content.length,
      "Content Prefix": preview,
      "Inline Error": error ?? "—",
    });
  }, [
    isDebugPublishing,
    publishDebug,
    conversationId,
    requestId,
    turnId,
    isStreamActive,
    compact,
    content,
    error,
  ]);

  // ── Markdown Draft Sink ──────────────────────────────────────────────────

  const draftKey = requestId ?? turnId;
  const canMarkdownSink = Boolean(conversationId && draftKey);

  const handleAssistantMarkdownChange = useCallback(
    (next: string) => {
      if (!conversationId || !draftKey) return;
      dispatch(
        upsertAssistantMarkdownDraft({
          conversationId,
          messageKey: draftKey,
          baseContent: content,
          draftContent: next,
        }),
      );
    },
    [conversationId, draftKey, content, dispatch],
  );

  // ── Actions ──────────────────────────────────────────────────────────────

  const { captureRef, isCapturing, captureAsPDF } = useDomCapturePrint();
  const handleFullPrint = useCallback(() => {
    captureAsPDF({
      filename: `agent-response-${turnId ?? requestId ?? "msg"}`,
    });
  }, [captureAsPDF, turnId, requestId]);

  // ── Render ───────────────────────────────────────────────────────────────

  const isError = content.startsWith("Error:");
  const markdownClassName = compact ? "text-xs bg-transparent" : "bg-textured";

  if (isError) {
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="shrink-0 w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5">
          <AlertCircle className="w-4 h-4 text-destructive" />
        </div>
        <span className="text-sm text-destructive/90">
          {content.replace("Error: ", "")}
        </span>
      </div>
    );
  }

  return (
    <div>
      {requestId && <AgentToolDisplay requestId={requestId} />}

      <div ref={captureRef}>
        <MarkdownStream
          requestId={requestId}
          content={content}
          type="message"
          role="assistant"
          isStreamActive={isStreamActive}
          hideCopyButton={true}
          allowFullScreenEditor={false}
          className={markdownClassName}
          serverProcessedBlocks={serverProcessedBlocks}
          onContentChange={
            canMarkdownSink ? handleAssistantMarkdownChange : undefined
          }
          applyLocalEdits={!canMarkdownSink}
        />
      </div>

      {error && (
        <div className="flex items-start gap-3 py-2 mt-1">
          <div className="shrink-0 w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5 animate-pulse">
            <AlertCircle className="w-4 h-4 text-destructive" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-sm font-medium text-destructive/90">
              {error}
            </span>
            <div className="h-[3px] w-24 rounded-full overflow-hidden bg-destructive/10">
              <div
                className="h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(var(--destructive) / 0.3) 0%, hsl(var(--destructive) / 0.8) 100%)",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {!isStreamActive && content && (
        <AssistantActionBar
          content={content}
          messageId={turnId ?? requestId ?? ""}
          conversationId={conversationId}
          onFullPrint={handleFullPrint}
          isCapturing={isCapturing}
        />
      )}
    </div>
  );
}
