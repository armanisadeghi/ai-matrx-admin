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
    content = "",
    events,
    strictServerData = false,
    serverProcessedBlocks,
    ...restProps
  } = props;

  const { hideCopyButton } = restProps;

  return (
    <BlockRenderingProvider strictServerData={strictServerData}>
      <MarkdownErrorBoundary
        fallback={
          <PlainTextFallback
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
          content={content}
          events={events}
          serverProcessedBlocks={serverProcessedBlocks}
          {...restProps}
        />
      </MarkdownErrorBoundary>
    </BlockRenderingProvider>
  );
};

export default MarkdownStreamImpl;
