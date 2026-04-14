import React from "react";
import { MarkdownErrorBoundary } from "./MarkdownErrorBoundary";
import { RenderBlock } from "../block-registry/BlockRenderer";
import dynamic from "next/dynamic";

const BlockRenderer = dynamic(
  () => import("../block-registry/BlockRenderer").then((m) => m.BlockRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="py-2 px-1 text-sm text-neutral-400 animate-pulse">
        Loading...
      </div>
    ),
  },
);

interface SafeBlockRendererProps {
  requestId?: string;
  block: RenderBlock;
  index: number;
  isStreamActive?: boolean;
  onContentChange?: (newContent: string) => void;
  messageId?: string;
  taskId?: string;
  isLastReasoningBlock?: boolean;
  replaceBlockContent: (original: string, replacement: string) => void;
  handleOpenEditor: () => void;
}

// Safe wrapper for individual block rendering
export const SafeBlockRenderer: React.FC<SafeBlockRendererProps> = ({
  requestId,
  block,
  index,
  isStreamActive,
  onContentChange,
  messageId,
  taskId,
  isLastReasoningBlock,
  replaceBlockContent,
  handleOpenEditor,
}) => {
  try {
    return (
      <MarkdownErrorBoundary
        fallback={
          <div className="py-2 px-1 text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap break-words border-l-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            {block.content || "[Block rendering failed]"}
          </div>
        }
      >
        <BlockRenderer
          requestId={requestId}
          block={block}
          index={index}
          isStreamActive={isStreamActive}
          onContentChange={onContentChange}
          messageId={messageId}
          taskId={taskId}
          isLastReasoningBlock={isLastReasoningBlock}
          replaceBlockContent={replaceBlockContent}
          handleOpenEditor={handleOpenEditor}
        />
      </MarkdownErrorBoundary>
    );
  } catch (error) {
    console.error("[MarkdownStream] Error rendering block:", error);
    return (
      <div className="py-2 px-1 text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap break-words border-l-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
        {block.content || "[Block rendering failed]"}
      </div>
    );
  }
};
