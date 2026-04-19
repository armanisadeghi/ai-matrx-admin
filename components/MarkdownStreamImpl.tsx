"use client";

import React from "react";
import { PlainTextFallback } from "@/components/mardown-display/chat-markdown/internal-handlers/PlainTextFallback";
import { MarkdownErrorBoundary } from "@/components/mardown-display/chat-markdown/internal-handlers/MarkdownErrorBoundary";
import { StreamAwareChatMarkdown } from "@/components/mardown-display/chat-markdown/StreamAwareChatMarkdown";
import { BlockRenderingProvider } from "@/components/mardown-display/chat-markdown/BlockRenderingContext";
import type { MarkdownStreamProps } from "./MarkdownStream";

const MarkdownStreamImpl: React.FC<MarkdownStreamProps> = ({
  content = "",
  events,
  taskId,
  requestId,
  turnId,
  conversationId,
  type,
  role,
  className,
  isStreamActive,
  onContentChange,
  applyLocalEdits,
  analysisData,
  messageId,
  allowFullScreenEditor,
  hideCopyButton,
  toolUpdates,
  onError,
  onPhaseUpdate,
  serverProcessedBlocks,
  strictServerData = false,
}) => {
  if (process.env.NODE_ENV !== "production") {
    if (type !== undefined) {
      console.warn(
        "[MarkdownStream] `type` prop is deprecated and no longer forwarded — still passed by a caller:",
        { requestId, turnId, conversationId, messageId, type },
      );
    }
    if (role !== undefined) {
      console.warn(
        "[MarkdownStream] `role` prop is deprecated and no longer forwarded — still passed by a caller:",
        { requestId, turnId, conversationId, messageId, role },
      );
    }
  }

  return (
    <BlockRenderingProvider strictServerData={strictServerData}>
      <MarkdownErrorBoundary
        fallback={<PlainTextFallback content={content} className={className} />}
        onError={(error, errorInfo) => {
          console.error(
            "[MarkdownStream] Top-level error boundary caught:",
            error,
            errorInfo,
          );
        }}
      >
        <StreamAwareChatMarkdown
          requestId={requestId}
          turnId={turnId}
          conversationId={conversationId}
          content={content}
          events={events}
          taskId={taskId}
          className={className}
          isStreamActive={isStreamActive}
          onContentChange={onContentChange}
          applyLocalEdits={applyLocalEdits}
          analysisData={analysisData}
          messageId={messageId}
          allowFullScreenEditor={allowFullScreenEditor}
          hideCopyButton={hideCopyButton}
          toolUpdates={toolUpdates}
          onError={onError}
          onPhaseUpdate={onPhaseUpdate}
          serverProcessedBlocks={serverProcessedBlocks}
        />
      </MarkdownErrorBoundary>
    </BlockRenderingProvider>
  );
};

export default MarkdownStreamImpl;
