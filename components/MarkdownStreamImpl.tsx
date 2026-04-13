"use client";

import React from "react";
import {
  PlainTextFallback,
  MarkdownErrorBoundary,
} from "@/components/mardown-display/chat-markdown/EnhancedChatMarkdown";
import { StreamAwareChatMarkdown } from "@/components/mardown-display/chat-markdown/StreamAwareChatMarkdown";
import { BlockRenderingProvider } from "@/components/mardown-display/chat-markdown/BlockRenderingContext";
import type { MarkdownStreamProps } from "./MarkdownStream";

const MarkdownStreamImpl: React.FC<MarkdownStreamProps> = (props) => {
  const {
    requestId,
    turnId,
    conversationId,
    content = "",
    events,
    strictServerData = false,
    ...restProps
  } = props;

  return (
    <BlockRenderingProvider strictServerData={strictServerData}>
      <MarkdownErrorBoundary
        fallback={
          <PlainTextFallback
            requestId={requestId}
            content={content}
            className={props.className}
            role={props.role}
            type={props.type}
          />
        }
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
          {...restProps}
        />
      </MarkdownErrorBoundary>
    </BlockRenderingProvider>
  );
};

export default MarkdownStreamImpl;
