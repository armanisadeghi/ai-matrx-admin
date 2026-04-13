"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  ErrorInfo,
  useContext,
} from "react";
import { cn } from "@/styles/themes/utils";
import {
  splitContentIntoBlocksV2,
  ContentBlock,
} from "../markdown-classification/processors/utils/content-splitter-v2";
import { InlineCopyButton } from "@/components/matrx/buttons/MarkdownCopyButton";
import MatrxMiniLoader from "@/components/loaders/MatrxMiniLoader";
import ToolCallVisualization from "@/features/chat/components/response/assistant-message/stream/ToolCallVisualization";
import { ReactReduxContext, useSelector } from "react-redux";
import dynamic from "next/dynamic";
import FullScreenMarkdownEditor from "./FullScreenMarkdownEditor";

import { selectPrimaryResponseToolBlocksByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { toolCallBlockToLegacy } from "@/lib/chat-protocol";
import type { ToolCallObject } from "@/lib/redux/socket-io/socket.types";
import {
  selectAccumulatedText,
  selectUnifiedSlots,
  selectToolLifecycle,
  selectAllRenderBlocks,
  type ContentSegment,
  type ContentSegmentDbTool,
  type UnifiedSlot,
} from "@/features/agents/redux/execution-system/active-requests/active-requests.selectors";
import { selectTurnInterleavedContent } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import type { RenderBlockPayload } from "@/types/python-generated/stream-events";
import type { ToolLifecycleEntry } from "@/features/agents/types/request.types";
import type { ToolCallPhase } from "@/lib/api/tool-call.types";
import { useAppSelector } from "@/lib/redux/hooks";

const BlockRenderer = dynamic(
  () => import("./block-registry/BlockRenderer").then((m) => m.BlockRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="py-2 px-1 text-sm text-neutral-400 animate-pulse">
        Loading...
      </div>
    ),
  },
);

// ============================================================================
// REDUX TOOL UPDATES — isolated subscriber so text-chunk re-renders don't
// cause this to re-execute, and tool-event updates don't re-render text blocks.
// ============================================================================

interface ReduxToolVisualizationProps {
  taskId: string;
  hasContent: boolean;
  className?: string;
}

/**
 * Subscribes to Redux rawToolEvents for a given taskId and renders
 * ToolCallVisualization. Isolated so that:
 *   - Text chunk re-renders (from parent) don't re-run the canonical selector.
 *   - New tool events re-render only this component, not the text blocks.
 */
const ReduxToolVisualization: React.FC<ReduxToolVisualizationProps> = ({
  taskId,
  hasContent,
  className,
}) => {
  // Stable selector instance — created once per taskId change (during render, not after).
  // selectPrimaryResponseToolBlocksByTaskId(taskId) produces a memoized createSelector instance;
  // keeping one reference per taskId ensures the memoization cache is reused across renders.
  const selector = useMemo(
    () => selectPrimaryResponseToolBlocksByTaskId(taskId),
    [taskId],
  );

  const toolBlocks = useSelector(selector);
  const toolUpdates: ToolCallObject[] = useMemo(
    () =>
      toolBlocks.flatMap(
        (b: any) => toolCallBlockToLegacy(b) as ToolCallObject[],
      ),
    [toolBlocks],
  );

  if (toolUpdates.length === 0) return null;

  return (
    <ToolCallVisualization
      toolUpdates={toolUpdates}
      hasContent={hasContent}
      className={className}
    />
  );
};

// ============================================================================
// INLINE TOOL CARD — subscribes to a single tool's lifecycle by callId.
// Renders independently; only re-renders when this specific tool changes.
// ============================================================================

function lifecycleToPhase(status: ToolLifecycleEntry["status"]): ToolCallPhase {
  switch (status) {
    case "completed":
      return "complete";
    case "error":
      return "error";
    default:
      return "running";
  }
}

function lifecycleToToolObjects(entry: ToolLifecycleEntry): ToolCallObject[] {
  const objects: ToolCallObject[] = [];

  objects.push({
    id: entry.callId,
    type: "mcp_input",
    mcp_input: { name: entry.toolName, arguments: entry.arguments },
    phase: lifecycleToPhase(entry.status),
  });

  if (entry.latestMessage) {
    objects.push({
      id: entry.callId,
      type: "user_message",
      user_message: entry.latestMessage,
    });
  }

  if (entry.latestData && Object.keys(entry.latestData).length > 0) {
    objects.push({
      id: entry.callId,
      type: "step_data",
      step_data: { type: entry.status, content: entry.latestData },
    });
  }

  if (entry.status === "completed" && entry.result != null) {
    objects.push({
      id: entry.callId,
      type: "mcp_output",
      mcp_output: { result: entry.result },
    });
  }

  if (entry.status === "error" && entry.errorMessage) {
    objects.push({
      id: entry.callId,
      type: "mcp_error",
      mcp_error: entry.errorMessage,
    });
  }

  return objects;
}

const InlineToolCard: React.FC<{
  requestId: string;
  callId: string;
}> = ({ requestId, callId }) => {
  const lifecycle = useAppSelector(selectToolLifecycle(requestId, callId));
  const toolObjects = useMemo(
    () => (lifecycle ? lifecycleToToolObjects(lifecycle) : []),
    [lifecycle],
  );

  if (toolObjects.length === 0) return null;

  return (
    <ToolCallVisualization
      toolUpdates={toolObjects}
      hasContent={true}
      className="my-2"
    />
  );
};

// ============================================================================
// DB TOOL CARD — renders a completed tool call from DB-loaded message parts.
// Self-contained: all data comes from the segment, no Redux subscription.
// ============================================================================

const DbToolCard: React.FC<{
  segment: ContentSegmentDbTool;
}> = ({ segment }) => {
  const toolObjects = useMemo((): ToolCallObject[] => {
    const objects: ToolCallObject[] = [];

    objects.push({
      id: segment.callId,
      type: "mcp_input",
      mcp_input: { name: segment.toolName, arguments: segment.arguments },
      phase: "complete" as ToolCallPhase,
    });

    if (segment.result != null) {
      if (segment.isError) {
        objects.push({
          id: segment.callId,
          type: "mcp_error",
          mcp_error: String(segment.result),
        });
      } else {
        // DB stores output as a JSON string — parse it so ToolCallVisualization
        // gets the same object shape as the streaming path.
        let parsed: unknown = segment.result;
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            // leave as raw string if not valid JSON
          }
        }
        objects.push({
          id: segment.callId,
          type: "mcp_output",
          mcp_output: { result: parsed },
        });
      }
    }

    return objects;
  }, [
    segment.callId,
    segment.toolName,
    segment.arguments,
    segment.result,
    segment.isError,
  ]);

  if (toolObjects.length === 0) return null;

  return (
    <ToolCallVisualization
      toolUpdates={toolObjects}
      hasContent={true}
      className="my-2"
    />
  );
};

// ============================================================================
// INLINE STATUS INDICATOR — transient shimmer label for phase/info events.
// Automatically removed from the segment list when real content supersedes it.
// ============================================================================

const InlineStatusIndicator: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-2 py-2">
    <span
      className="inline-block text-sm bg-clip-text text-transparent bg-[length:200%_100%] animate-shimmer"
      style={{
        backgroundImage:
          "linear-gradient(90deg, hsl(var(--muted-foreground) / 0.3) 0%, hsl(var(--foreground)) 50%, hsl(var(--muted-foreground) / 0.3) 100%)",
      }}
    >
      {label}
    </span>
  </div>
);

/** Server-processed block from the content_block protocol. */
export interface ServerProcessedBlock {
  blockId: string;
  blockIndex: number;
  type: string;
  status: "streaming" | "complete" | "error";
  content?: string | null;
  data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

export interface ChatMarkdownDisplayProps {
  requestId?: string;
  /** Turn ID for DB-loaded turn rendering */
  turnId?: string;
  /** Conversation ID for DB-loaded turn rendering */
  conversationId?: string;
  content: string;
  taskId?: string;
  type?:
    | "flashcard"
    | "message"
    | "text"
    | "image"
    | "audio"
    | "video"
    | "file"
    | string;
  role?: "user" | "assistant" | "system" | "tool" | string;
  className?: string;
  isStreamActive?: boolean;
  onContentChange?: (newContent: string) => void;
  analysisData?: any;
  messageId?: string;
  allowFullScreenEditor?: boolean;
  hideCopyButton?: boolean;
  useV2Parser?: boolean; // Default: true (V2 parser). Set to false to use legacy V1 parser.
  toolUpdates?: any[]; // Optional: Pass tool updates directly (bypasses Redux selector)
  /** Pre-processed blocks from server (new content_block protocol). Bypasses client-side parsing. */
  serverProcessedBlocks?: ServerProcessedBlock[];
  /**
   * When false with onContentChange, edits call onContentChange(fullMarkdown) but the
   * rendered document does not switch to local `editedContent` (UI keeps `content` prop).
   */
  applyLocalEdits?: boolean;
}

// Fallback component that renders plain text with basic formatting
export const PlainTextFallback: React.FC<{
  requestId?: string;
  content: string;
  className?: string;
  role?: string;
  type?: string;
}> = ({ requestId, content, className, role, type }) => {
  const containerStyles = cn(
    "py-3 px-4 space-y-2 font-sans text-md antialiased leading-relaxed tracking-wide whitespace-pre-wrap break-words overflow-x-hidden min-w-0",
    type === "flashcard"
      ? "text-left mb-1 text-white"
      : `block rounded-lg w-full ${
          role === "user"
            ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
            : "bg-textured"
        }`,
    className,
  );

  return (
    <div
      className={`${type === "message" ? "mb-3 w-full min-w-0" : ""} ${role === "user" ? "text-right" : "text-left"} overflow-x-hidden`}
    >
      <div className={containerStyles}>{content || "No content available"}</div>
    </div>
  );
};

// Error boundary component for catching React errors
export class MarkdownErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback: React.ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
  },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      "[MarkdownStream] Error caught by boundary:",
      error,
      errorInfo,
    );
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Safe wrapper for individual block rendering
const SafeBlockRenderer: React.FC<{
  requestId?: string;
  block: ContentBlock;
  index: number;
  isStreamActive?: boolean;
  onContentChange?: (newContent: string) => void;
  messageId?: string;
  taskId?: string;
  isLastReasoningBlock?: boolean;
  replaceBlockContent: (original: string, replacement: string) => void;
  handleOpenEditor: () => void;
}> = (props) => {
  try {
    return (
      <MarkdownErrorBoundary
        fallback={
          <div className="py-2 px-1 text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap break-words border-l-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            {props.block.content || "[Block rendering failed]"}
          </div>
        }
      >
        <BlockRenderer {...props} />
      </MarkdownErrorBoundary>
    );
  } catch (error) {
    console.error("[MarkdownStream] Error rendering block:", error);
    return (
      <div className="py-2 px-1 text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap break-words border-l-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
        {props.block.content || "[Block rendering failed]"}
      </div>
    );
  }
};

const _EMPTY_SEGMENTS: ContentSegment[] = [];
const _EMPTY_SLOTS: UnifiedSlot[] = [];
const _selectEmptyString = () => "";
const _selectEmptySegments = () => _EMPTY_SEGMENTS;
const _selectEmptySlots = () => _EMPTY_SLOTS;
const _selectEmptyRenderBlocks = () =>
  undefined as RenderBlockPayload[] | undefined;

function renderBlockToContentBlock(
  rb: RenderBlockPayload,
): ContentBlock & { serverData?: Record<string, unknown> } {
  return {
    type: rb.type as ContentBlock["type"],
    content: rb.content ?? "",
    serverData: (rb.data as Record<string, unknown>) ?? undefined,
    metadata: rb.metadata,
    language: (rb.data as Record<string, unknown>)?.language as
      | string
      | undefined,
    src: (rb.data as Record<string, unknown>)?.src as string | undefined,
    alt: (rb.data as Record<string, unknown>)?.alt as string | undefined,
  };
}

export const EnhancedChatMarkdownInternal: React.FC<
  ChatMarkdownDisplayProps
> = ({
  requestId,
  turnId,
  conversationId,
  content,
  taskId,
  type = "message",
  role = "assistant",
  className,
  isStreamActive,
  onContentChange,
  analysisData,
  messageId,
  allowFullScreenEditor = true,
  hideCopyButton = true,
  useV2Parser = true,
  toolUpdates: toolUpdatesProp,
  serverProcessedBlocks,
  applyLocalEdits = true,
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  const reduxContext = useContext(ReactReduxContext);
  const hasReduxProvider =
    reduxContext !== null && reduxContext.store !== undefined;

  const requestTextSelector = useMemo(
    () => (requestId ? selectAccumulatedText(requestId) : _selectEmptyString),
    [requestId],
  );
  const requestText = useAppSelector(requestTextSelector);

  const unifiedSlotsSelector = useMemo(
    () => (requestId ? selectUnifiedSlots(requestId) : _selectEmptySlots),
    [requestId],
  );
  const unifiedSlots = useAppSelector(unifiedSlotsSelector);

  const dbTurnSegments = useAppSelector(
    turnId && conversationId
      ? selectTurnInterleavedContent(conversationId, turnId)
      : _selectEmptySegments,
  );

  const renderBlocksSelector = useMemo(
    () =>
      requestId ? selectAllRenderBlocks(requestId) : _selectEmptyRenderBlocks,
    [requestId],
  );
  const reduxRenderBlocks = useAppSelector(renderBlocksSelector);

  const renderBlocksMap = useMemo(() => {
    if (!reduxRenderBlocks) return {};
    const map: Record<string, RenderBlockPayload> = {};
    for (const b of reduxRenderBlocks) {
      map[b.blockId] = b;
    }
    return map;
  }, [reduxRenderBlocks]);

  const hasClientBlocks = !!(
    reduxRenderBlocks &&
    reduxRenderBlocks.length > 0 &&
    reduxRenderBlocks.some((b) => b.blockId.startsWith("client_"))
  );

  const resolvedContent = requestText || content;
  const currentContent = editedContent ?? resolvedContent;

  const hasRequestOrTaskId = requestId || taskId;
  const isWaitingForContent = hasRequestOrTaskId && !resolvedContent.trim();

  const hasUnifiedSpecial = unifiedSlots.some(
    (s) => s.kind === "tool" || s.kind === "status",
  );

  const hasDbInterleavedSpecial = dbTurnSegments.some(
    (s) => s.type === "db_tool" || s.type === "thinking",
  );

  const toolUpdates = toolUpdatesProp ?? [];

  useEffect(() => {
    if (isStreamActive) {
      setEditedContent(null);
    }
  }, [isStreamActive]);

  useEffect(() => {
    if (applyLocalEdits === false) {
      setEditedContent(null);
    }
  }, [applyLocalEdits, resolvedContent]);

  // When server-processed blocks are available, use them directly (skip client-side parsing).
  // Otherwise, fall back to the client-side splitContentIntoBlocksV2 pipeline.
  const useServerBlocks =
    serverProcessedBlocks && serverProcessedBlocks.length > 0;

  // Memoize the content splitting to avoid unnecessary re-processing
  // Skip expensive processing if we're in loading state
  // NOTE: Do NOT call setState (like setHasError) inside useMemo — it's a React anti-pattern
  // that triggers re-renders during render, potentially causing infinite loops.
  const { blocks, blockError } = useMemo(() => {
    if (isWaitingForContent) return { blocks: [], blockError: false };

    // Fast path: Redux already has client-generated render blocks from the
    // StreamBlockAccumulator. Convert to ContentBlock shape and skip the
    // expensive splitContentIntoBlocksV2 entirely.
    if (hasClientBlocks && reduxRenderBlocks) {
      const clientBlocks: ContentBlock[] = reduxRenderBlocks
        .filter((rb) => rb.content?.trim())
        .map(renderBlockToContentBlock);
      return { blocks: clientBlocks, blockError: false };
    }

    // New protocol: server already processed the blocks — convert to ContentBlock shape.
    // When text content also exists, parse it through the normal pipeline first,
    // then append server-processed blocks (audio, images, etc.) so both render.
    if (useServerBlocks && serverProcessedBlocks) {
      const supplementaryBlocks: ContentBlock[] = serverProcessedBlocks.map(
        (sb) => ({
          type: sb.type as ContentBlock["type"],
          content: sb.content ?? "",
          serverData: sb.data ?? undefined,
          metadata: sb.metadata,
          language: (sb.data as any)?.language,
          src: (sb.data as any)?.src,
          alt: (sb.data as any)?.alt,
        }),
      );

      // If there's also text content, parse it normally and append supplementary blocks
      if (currentContent.trim()) {
        try {
          const textBlocks = splitContentIntoBlocksV2(currentContent);
          const parsed = Array.isArray(textBlocks) ? textBlocks : [];
          return {
            blocks: [...parsed, ...supplementaryBlocks],
            blockError: false,
          };
        } catch {
          return {
            blocks: [
              {
                type: "text" as const,
                content: currentContent,
                startLine: 0,
                endLine: 0,
              },
              ...supplementaryBlocks,
            ],
            blockError: false,
          };
        }
      }

      return { blocks: supplementaryBlocks, blockError: false };
    }

    // Legacy: client-side parsing
    try {
      const result = splitContentIntoBlocksV2(currentContent);

      return { blocks: Array.isArray(result) ? result : [], blockError: false };
    } catch (error) {
      console.error(
        "[MarkdownStream] Error splitting content into blocks:",
        error,
      );
      // Return a single text block with the original content as fallback
      return {
        blocks: [
          {
            type: "text" as const,
            content: currentContent,
            startLine: 0,
            endLine: 0,
          },
        ],
        blockError: true,
      };
    }
  }, [
    currentContent,
    isWaitingForContent,
    useV2Parser,
    useServerBlocks,
    serverProcessedBlocks,
    hasClientBlocks,
    reduxRenderBlocks,
  ]);

  // Handle block processing errors outside of useMemo to avoid setState during render
  useEffect(() => {
    if (blockError) {
      setHasError(true);
    }
  }, [blockError]);

  // Post-process blocks: consolidate consecutive reasoning blocks when NOT streaming.
  // During streaming, each reasoning block renders individually (real-time feedback).
  // Once complete, consecutive reasoning blocks merge into a single unified display.
  // Reasoning blocks separated by other content (text, tool calls, etc.) stay separate.
  const processedBlocks = useMemo(() => {
    // During streaming, return blocks as-is for real-time display
    if (isStreamActive) return blocks;

    const result: ContentBlock[] = [];
    let i = 0;

    while (i < blocks.length) {
      if (blocks[i].type === "reasoning") {
        // Collect consecutive reasoning blocks
        const reasoningGroup: string[] = [];
        while (i < blocks.length && blocks[i].type === "reasoning") {
          reasoningGroup.push(blocks[i].content);
          i++;
        }

        if (reasoningGroup.length > 1) {
          // Multiple consecutive reasoning blocks — consolidate
          result.push({
            type: "consolidated_reasoning",
            content: reasoningGroup.join("\n---\n"), // Join for fallback
            metadata: { reasoningTexts: reasoningGroup },
          });
        } else {
          // Single reasoning block — keep as-is
          result.push({
            type: "reasoning",
            content: reasoningGroup[0],
          });
        }
      } else {
        result.push(blocks[i]);
        i++;
      }
    }

    return result;
  }, [blocks, isStreamActive]);

  // Find the index of the last reasoning block for animation purposes
  const lastReasoningBlockIndex = useMemo(() => {
    for (let i = processedBlocks.length - 1; i >= 0; i--) {
      if (processedBlocks[i].type === "reasoning") {
        return i;
      }
    }
    return -1;
  }, [processedBlocks]);

  // Note: Table parsing removed - StreamingTableRenderer handles it directly from block content

  /**
   * Generic content replacement handler — used by ALL block types that modify
   * the content string (code edits, table edits, broker updates, decision
   * resolutions, quiz results, etc.). Blocks call this with the original
   * substring and its replacement; the full content string is managed here.
   */
  const replaceBlockContent = useCallback(
    (original: string, replacement: string) => {
      try {
        const idx = currentContent.indexOf(original);
        if (idx === -1) {
          console.warn(
            "[MarkdownStream] replaceBlockContent: original substring not found in content.",
            { originalLen: original.length, contentLen: currentContent.length },
          );
          return;
        }
        const updatedContent =
          currentContent.slice(0, idx) +
          replacement +
          currentContent.slice(idx + original.length);
        onContentChange?.(updatedContent);
        if (applyLocalEdits !== false) {
          setEditedContent(updatedContent);
        }
      } catch (error) {
        console.error("[MarkdownStream] Error in replaceBlockContent:", error);
      }
    },
    [currentContent, onContentChange, applyLocalEdits],
  );

  const handleOpenEditor = useCallback(() => {
    try {
      if (isStreamActive) return;
      setIsEditorOpen(true);
    } catch (error) {
      console.error("[MarkdownStream] Error opening editor:", error);
    }
  }, [isStreamActive]);

  const handleCancelEdit = useCallback(() => {
    try {
      setIsEditorOpen(false);
    } catch (error) {
      console.error("[MarkdownStream] Error canceling edit:", error);
    }
  }, []);

  const handleSaveEdit = useCallback(
    (newContent: string) => {
      try {
        onContentChange?.(newContent);
        if (applyLocalEdits !== false) {
          setEditedContent(newContent);
        }
        setIsEditorOpen(false);
      } catch (error) {
        console.error("[MarkdownStream] Error saving edit:", error);
      }
    },
    [onContentChange, applyLocalEdits],
  );

  // Stable key: type + content fingerprint. Prevents React from reusing a
  // component instance when blocks shift (e.g. a decision block resolves and
  // the array collapses). Index is appended only as a tiebreaker for identical
  // blocks; the content prefix keeps identity stable across re-parses.
  const blockKey = useCallback(
    (block: ContentBlock, index: number) =>
      `${block.type}-${block.content.slice(0, 100)}-${index}`,
    [],
  );

  // Memoize the render block function to prevent unnecessary re-renders
  const renderBlock = useCallback(
    (block: ContentBlock, index: number) => {
      try {
        if (!block || typeof block !== "object") {
          console.warn("[MarkdownStream] Invalid block at index:", index);
          return null;
        }

        return (
          <SafeBlockRenderer
            key={blockKey(block, index)}
            block={block}
            index={index}
            isStreamActive={isStreamActive}
            onContentChange={onContentChange}
            messageId={messageId}
            requestId={requestId}
            taskId={taskId}
            isLastReasoningBlock={index === lastReasoningBlockIndex}
            replaceBlockContent={replaceBlockContent}
            handleOpenEditor={handleOpenEditor}
          />
        );
      } catch (error) {
        console.error(
          "[MarkdownStream] Error in renderBlock at index:",
          index,
          error,
        );
        return (
          <div
            key={blockKey(block, index)}
            className="py-2 px-1 text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap break-words border-l-2 border-red-500 bg-red-50 dark:bg-red-950/20"
          >
            {block?.content || "[Render error]"}
          </div>
        );
      }
    },
    [
      blockKey,
      isStreamActive,
      onContentChange,
      messageId,
      taskId,
      lastReasoningBlockIndex,
      replaceBlockContent,
      handleOpenEditor,
    ],
  );

  const containerStyles = cn(
    "pt-1 pb-0 px-0 space-y-4 font-sans text-md antialiased leading-relaxed tracking-wide overflow-x-hidden min-w-0 break-words",
    type === "flashcard"
      ? "text-left mb-0 text-white"
      : `block rounded-lg w-full ${
          role === "user"
            ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
            : "bg-textured"
        }`,
    className,
  );

  // If there was a critical error, show fallback
  if (hasError) {
    return (
      <PlainTextFallback
        requestId={requestId}
        content={currentContent}
        className={className}
        role={role}
        type={type}
      />
    );
  }

  // When requestId is present and unified slots have non-text content
  // (tools, status), skip the generic loader and let the unified renderer
  // handle it — even before any text arrives.
  const hasPreTextSegments =
    isWaitingForContent &&
    requestId &&
    unifiedSlots.some((s) => s.kind === "tool" || s.kind === "status");

  if (isWaitingForContent && !hasPreTextSegments && toolUpdates.length === 0) {
    const hasReduxTaskId =
      hasReduxProvider && !!taskId && toolUpdatesProp === undefined;

    if (hasReduxTaskId) {
      return (
        <div
          className={`${type === "message" ? "mb-1 w-full min-w-0" : ""} ${role === "user" ? "text-right" : "text-left"} overflow-x-hidden`}
        >
          <MarkdownErrorBoundary
            fallback={null}
            onError={(error) =>
              console.error(
                "[MarkdownStream] ReduxToolVisualization error:",
                error,
              )
            }
          >
            <ReduxToolVisualization
              taskId={taskId!}
              hasContent={false}
              className="mb-2"
            />
          </MarkdownErrorBoundary>
          <div className={containerStyles}>
            <div className="flex items-center justify-start py-6">
              <MatrxMiniLoader />
            </div>
          </div>
        </div>
      );
    }

    try {
      return (
        <div
          className={`${type === "message" ? "mb-1 w-full min-w-0" : ""} ${role === "user" ? "text-right" : "text-left"} overflow-x-hidden`}
        >
          <div className={containerStyles}>
            <div className="flex items-center justify-start py-6">
              <MatrxMiniLoader />
            </div>
          </div>
        </div>
      );
    } catch (error) {
      console.error("[MarkdownStream] Error rendering loading state:", error);
      return (
        <PlainTextFallback
          content="Loading..."
          className={className}
          role={role}
          type={type}
        />
      );
    }
  }

  try {
    return (
      <div
        className={`${type === "message" ? "mb-1 w-full min-w-0" : ""} ${role === "user" ? "text-right" : "text-left"} overflow-x-hidden`}
      >
        {/* Redux-based tool updates: isolated subscriber, only re-renders on tool events */}
        {hasReduxProvider && taskId && toolUpdatesProp === undefined && (
          <MarkdownErrorBoundary
            fallback={null}
            onError={(error) =>
              console.error(
                "[MarkdownStream] ReduxToolVisualization error:",
                error,
              )
            }
          >
            <ReduxToolVisualization
              taskId={taskId}
              hasContent={!!resolvedContent.trim()}
              className="mb-2"
            />
          </MarkdownErrorBoundary>
        )}

        {/* Prop-based tool updates (event mode / legacy adapter) */}
        {toolUpdatesProp !== undefined && toolUpdates.length > 0 && (
          <MarkdownErrorBoundary
            fallback={null}
            onError={(error) =>
              console.error(
                "[MarkdownStream] ToolCallVisualization error:",
                error,
              )
            }
          >
            <ToolCallVisualization
              toolUpdates={toolUpdates}
              hasContent={!!resolvedContent.trim()}
              className="mb-2"
            />
          </MarkdownErrorBoundary>
        )}

        <div className={containerStyles}>
          {hasUnifiedSpecial && requestId
            ? unifiedSlots.map((slot, i) => {
                if (slot.kind === "render_block") {
                  const rb = renderBlocksMap[slot.blockId];
                  if (!rb || !rb.content?.trim()) return null;
                  const block = renderBlockToContentBlock(rb);
                  return renderBlock(block, i);
                }
                if (slot.kind === "tool") {
                  return (
                    <InlineToolCard
                      key={`tool-${slot.callId}`}
                      requestId={requestId}
                      callId={slot.callId}
                    />
                  );
                }
                if (slot.kind === "status") {
                  return (
                    <InlineStatusIndicator
                      key={`status-${i}`}
                      label={slot.label}
                    />
                  );
                }
                return null;
              })
            : hasDbInterleavedSpecial
              ? dbTurnSegments.map((segment, segIdx) => {
                  if (segment.type === "db_tool") {
                    return (
                      <DbToolCard
                        key={`db-tool-${segment.callId}`}
                        segment={segment}
                      />
                    );
                  }
                  if (segment.type === "thinking") {
                    const thinkBlocks = (() => {
                      try {
                        return splitContentIntoBlocksV2(segment.content);
                      } catch {
                        return [
                          {
                            type: "reasoning" as const,
                            content: segment.content,
                            startLine: 0,
                            endLine: 0,
                          },
                        ];
                      }
                    })();
                    return thinkBlocks.map((block, blockIdx) =>
                      renderBlock(
                        { ...block, type: "reasoning" },
                        segIdx * 1000 + blockIdx,
                      ),
                    );
                  }
                  if (segment.type === "text") {
                    const segBlocks = (() => {
                      try {
                        return splitContentIntoBlocksV2(segment.content);
                      } catch {
                        return [
                          {
                            type: "text" as const,
                            content: segment.content,
                            startLine: 0,
                            endLine: 0,
                          },
                        ];
                      }
                    })();
                    return segBlocks.map((block, blockIdx) =>
                      renderBlock(block, segIdx * 1000 + blockIdx),
                    );
                  }
                  return null;
                })
              : processedBlocks.map((block, index) =>
                  renderBlock(block, index),
                )}
        </div>

        {!hideCopyButton && (
          <MarkdownErrorBoundary
            fallback={null}
            onError={(error) =>
              console.error("[MarkdownStream] CopyButton error:", error)
            }
          >
            <InlineCopyButton
              markdownContent={currentContent}
              size="xs"
              position="center-right"
              isMarkdown={true}
              constrainToParent={true}
            />
          </MarkdownErrorBoundary>
        )}

        {allowFullScreenEditor && (
          <MarkdownErrorBoundary
            fallback={null}
            onError={(error) =>
              console.error("[MarkdownStream] FullScreenEditor error:", error)
            }
          >
            <FullScreenMarkdownEditor
              isOpen={isEditorOpen}
              initialContent={currentContent}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              analysisData={analysisData}
              messageId={messageId}
              tabs={["write", "matrx_split", "markdown", "wysiwyg", "preview"]}
              initialTab="matrx_split"
            />
          </MarkdownErrorBoundary>
        )}
      </div>
    );
  } catch (error) {
    console.error("[MarkdownStream] Critical error in render:", error);
    return (
      <PlainTextFallback
        content={currentContent}
        className={className}
        role={role}
        type={type}
      />
    );
  }
};
