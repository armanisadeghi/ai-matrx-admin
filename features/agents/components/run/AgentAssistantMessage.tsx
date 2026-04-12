"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Edit, MoreHorizontal, Copy, Check, AlertCircle } from "lucide-react";
import { useDomCapturePrint } from "@/features/chat/hooks/useDomCapturePrint";
import MarkdownStream from "@/components/MarkdownStream";
import MessageOptionsMenu from "@/features/chat/components/response/assistant-message/MessageOptionsMenu";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  openFullScreenEditor,
  openHtmlPreview,
} from "@/lib/redux/slices/overlaySlice";
import { useDebugContext } from "@/hooks/useDebugContext";
import { upsertAssistantMarkdownDraft } from "@/features/agents/redux/agent-assistant-markdown-draft.slice";
import type { ServerProcessedBlock } from "@/components/mardown-display/chat-markdown/EnhancedChatMarkdown";

export interface AgentAssistantMessageProps {
  content: string;
  messageIndex: number;
  isStreamActive?: boolean;
  compact?: boolean;
  error?: string | null;
  /** Execution instance id — shown in Admin Indicator debug panel when debug mode is on. */
  conversationId?: string;
  /** Stable row id (e.g. turn id or `__streaming__`) for correlating copies. */
  messageKey?: string;
  /**
   * Server-processed content blocks (audio, images, search results, etc.)
   * from the completed stream or live during streaming. Rendered inside MarkdownStream.
   */
  serverProcessedBlocks?: ServerProcessedBlock[];
}

export function AgentAssistantMessage({
  content,
  messageIndex,
  isStreamActive = false,
  compact = false,
  error,
  conversationId,
  messageKey,
  serverProcessedBlocks,
}: AgentAssistantMessageProps) {
  const dispatch = useAppDispatch();
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const moreOptionsButtonRef = useRef<HTMLButtonElement>(null);
  const { publish: publishDebug, isActive: isDebugPublishing } =
    useDebugContext("AgentAssistantMessage");

  useEffect(() => {
    if (!isDebugPublishing) return;
    const preview =
      content.length <= 200 ? content : `${content.slice(0, 200)}…`;
    publishDebug({
      ...(conversationId !== undefined && {
        "Conversation ID": conversationId,
      }),
      ...(messageKey !== undefined && { "Message Key": messageKey }),
      "Message Index": messageIndex,
      "Stream Active": isStreamActive,
      Compact: compact,
      "Content Length": content.length,
      "Content Prefix": preview,
      "Inline Error": error ?? "—",
      "Is Error Content": content.startsWith("Error:"),
    });
  }, [
    isDebugPublishing,
    publishDebug,
    conversationId,
    messageKey,
    messageIndex,
    isStreamActive,
    compact,
    content,
    error,
  ]);

  const canMarkdownSink = Boolean(conversationId && messageKey);

  const handleAssistantMarkdownChange = useCallback(
    (next: string) => {
      if (!conversationId || !messageKey) return;
      dispatch(
        upsertAssistantMarkdownDraft({
          conversationId,
          messageKey,
          baseContent: content,
          draftContent: next,
        }),
      );
      if (isDebugPublishing) {
        publishDebug({
          "Sink draft length": next.length,
          "Sink updated at": new Date().toISOString(),
        });
      }
    },
    [
      conversationId,
      messageKey,
      content,
      dispatch,
      isDebugPublishing,
      publishDebug,
    ],
  );

  const { captureRef, isCapturing, captureAsPDF } = useDomCapturePrint();
  const handleFullPrint = useCallback(() => {
    captureAsPDF({ filename: `agent-response-${messageIndex}` });
  }, [captureAsPDF, messageIndex]);

  const handleEditClick = () => {
    dispatch(
      openFullScreenEditor({
        content,
        tabs: ["write", "matrx_split", "markdown", "wysiwyg", "preview"],
        initialTab: "matrx_split",
        showSaveButton: false,
      }),
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // silent
    }
  };

  const handleShowHtmlPreview = () => {
    dispatch(openHtmlPreview({ content }));
  };

  const isError = content.startsWith("Error:");
  const markdownClassName = compact ? "text-xs bg-transparent" : "bg-textured";
  const buttonMargin = compact ? "mt-0.5" : "mt-1";

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
      <div ref={captureRef}>
        <MarkdownStream
          content={content}
          type="message"
          role="assistant"
          isStreamActive={isStreamActive}
          hideCopyButton={true}
          allowFullScreenEditor={false}
          className={markdownClassName}
          onContentChange={
            canMarkdownSink ? handleAssistantMarkdownChange : undefined
          }
          applyLocalEdits={!canMarkdownSink}
          serverProcessedBlocks={serverProcessedBlocks}
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
        <div className={`flex items-center gap-1 ${buttonMargin}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 w-6 p-0 text-muted-foreground"
            title="Copy"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEditClick}
            className="h-6 w-6 p-0 text-muted-foreground"
            title="Edit in full screen"
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button
            ref={moreOptionsButtonRef}
            variant="ghost"
            size="sm"
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className="h-6 w-6 p-0 text-muted-foreground"
            title="More options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
          <MessageOptionsMenu
            isOpen={showOptionsMenu}
            content={content}
            onClose={() => setShowOptionsMenu(false)}
            onShowHtmlPreview={handleShowHtmlPreview}
            onEditContent={handleEditClick}
            onFullPrint={handleFullPrint}
            isCapturing={isCapturing}
            anchorElement={moreOptionsButtonRef.current}
          />
        </div>
      )}
    </div>
  );
}
