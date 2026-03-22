"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  lazy,
  Suspense,
} from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Edit,
  MoreHorizontal,
  Volume2,
  Pause,
  Download,
  Link as LinkIcon,
  Loader2,
  Save,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TapTargetButtonTransparent } from "@/app/(ssr)/_components/core/TapTargetButton";
import MarkdownStream from "@/components/MarkdownStream";
import { StreamingContentBlocks } from "@/features/cx-conversation/StreamingContentBlocks";
import { useDomCapturePrint } from "@/features/conversation/hooks/useDomCapturePrint";
import { useHtmlPreviewState } from "@/features/html-pages/hooks/useHtmlPreviewState";
import { parseMarkdownToText } from "@/utils/markdown-processors/parse-markdown-for-speech";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";
import { selectMessageHasUnsavedChanges, selectMessageHasHistory } from "@/features/cx-conversation/redux/selectors";
import { editMessage } from "@/features/cx-conversation/redux/thunks/editMessage";
import { buildContentBlocksForSave } from "@/features/cx-conversation/utils/buildContentBlocksForSave";
import type { CartesiaControls } from "@/hooks/tts/simple/useCartesiaControls";
import type { ConversationMessage } from "@/features/cx-conversation/redux/types";

// ── Lazy-load heavy deps (only when needed) ───────────────────────────────────
const FullScreenMarkdownEditor = lazy(
  () =>
    import("@/components/mardown-display/chat-markdown/FullScreenMarkdownEditor"),
);
const HtmlPreviewFullScreenEditor = lazy(
  () => import("@/features/html-pages/components/HtmlPreviewFullScreenEditor"),
);
const ConversationMessageOptionsMenu = lazy(
  () => import("@/features/cx-conversation/MessageOptionsMenu"),
);
const ToolCallVisualization = lazy(
  () => import("@/features/cx-conversation/ToolCallVisualization"),
);
const ContentHistoryViewer = lazy(
  () =>
    import("@/features/cx-conversation/ContentHistoryViewer").then((m) => ({
      default: m.ContentHistoryViewer,
    })),
);

// ============================================================================
// PROPS
// ============================================================================

export interface AssistantMessageProps {
  message: ConversationMessage;
  /** The session this message belongs to (for options menu context) */
  sessionId?: string;
  /** Whether stream is currently active for this message */
  isStreamActive?: boolean;
  /** Compact mode: reduced spacing, text-xs markdown */
  compact?: boolean;
  /** Overlay mode: hides action bar (used in ToolUpdatesOverlay) */
  isOverlay?: boolean;
  /** Cartesia TTS controls — passed from parent holding the single connection */
  audioControls?: CartesiaControls;
  /** Whether this message expects a TTS (audio) response */
  isTtsRequest?: boolean;
  /** Callback when content is edited */
  onContentChange?: (messageId: string, newContent: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AssistantMessage({
  message,
  sessionId,
  isStreamActive = false,
  compact = false,
  isOverlay = false,
  audioControls,
  isTtsRequest = false,
  onContentChange,
}: AssistantMessageProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showHtmlModal, setShowHtmlModal] = useState(false);
  const [showHistoryViewer, setShowHistoryViewer] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isAppearing, setIsAppearing] = useState(true);
  const [isAudioLinkCopied, setIsAudioLinkCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const moreOptionsButtonRef = useRef<HTMLDivElement>(null);

  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const hasUnsavedChanges = useAppSelector((state) =>
    sessionId ? selectMessageHasUnsavedChanges(state, sessionId, message.id) : false
  );
  const hasHistory = useAppSelector((state) =>
    sessionId ? selectMessageHasHistory(state, sessionId, message.id) : false
  );

  // DOM-capture PDF (Tier 2 — captures all rendered blocks)
  const { captureRef, captureAsPDF } = useDomCapturePrint();
  const handleFullPrint = useCallback(() => {
    captureAsPDF({ filename: `ai-response-${message.id}` });
  }, [captureAsPDF, message.id]);

  // HTML preview state
  const htmlPreviewState = useHtmlPreviewState({
    markdownContent: message.content,
    user,
    isOpen: showHtmlModal,
  });

  // Fade-in entrance
  useEffect(() => {
    const t = setTimeout(() => setIsAppearing(false), 50);
    return () => clearTimeout(t);
  }, []);

  // ── Cartesia TTS controls ─────────────────────────────────────────────────
  const {
    connectionState,
    playerState,
    speak,
    pause,
    resume,
    handleScriptChange,
  } = audioControls ?? {};

  const isPlaying = playerState === "playing";
  const isPaused = playerState === "paused";
  const isAudioReady = connectionState === "ready";

  const handleSpeakToggle = () => {
    if (!audioControls) return;
    if (isPlaying) {
      pause?.();
    } else if (isPaused) {
      resume?.();
    } else {
      const cleanContent = parseMarkdownToText(message.content);
      handleScriptChange?.(cleanContent);
      speak?.(cleanContent);
    }
  };

  // ── Copy ──────────────────────────────────────────────────────────────────
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEditClick = () => setIsEditorOpen(true);
  const handleSaveEdit = (newContent: string) => {
    onContentChange?.(message.id, newContent);
    setIsEditorOpen(false);
  };
  const handleCancelEdit = () => setIsEditorOpen(false);

  // ── Quick save ───────────────────────────────────────────────────────────
  const handleQuickSave = async () => {
    if (!sessionId || isSaving) return;
    setIsSaving(true);
    try {
      const contentBlocks = buildContentBlocksForSave(
        message.content,
        message.rawContent as unknown[] | undefined
      );
      await dispatch(
        editMessage({ sessionId, messageId: message.id, newContent: contentBlocks })
      ).unwrap();
    } catch {
      /* toast handled by thunk */
    } finally {
      setIsSaving(false);
    }
  };

  // ── Audio download ────────────────────────────────────────────────────────
  const audioUrl = (message as ConversationMessage & { audioUrl?: string })
    .audioUrl;
  const audioMimeType = (
    message as ConversationMessage & { audioMimeType?: string }
  ).audioMimeType;

  const handleDownloadAudio = async () => {
    if (!audioUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      const resp = await fetch(audioUrl);
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const ext = audioMimeType?.split("/")[1] ?? "wav";
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `audio-response.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      /* silent */
    } finally {
      setIsDownloading(false);
    }
  };

  // ── Determine content mode ────────────────────────────────────────────────
  // block mode: message.streamEvents contains content_block protocol events
  const hasBlockModeEvents =
    message.streamEvents &&
    message.streamEvents.length > 0 &&
    message.streamEvents.some((e) => e.event === "content_block");
  // normal mode: message.streamEvents contains chunk+tool_event stream events
  const hasStreamEvents =
    message.streamEvents &&
    message.streamEvents.length > 0 &&
    !hasBlockModeEvents;
  // DB-loaded tool updates (no active stream)
  const hasDbToolUpdates =
    !message.streamEvents &&
    message.toolUpdates &&
    (message.toolUpdates as unknown[]).length > 0;

  const isError = message.status === "error";
  const isAudioResponse = !!audioUrl;

  // Loading: pending or streaming with no content yet
  const showLoading =
    message.status === "pending" ||
    (message.status === "streaming" &&
      !message.content &&
      !message.streamEvents?.length);

  const markdownClassName = compact ? "text-xs bg-transparent" : "bg-textured";
  const buttonMargin = compact ? "mt-0.5" : "mt-1";

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div
      className={`flex min-w-0 overflow-x-hidden ${isAppearing ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
    >
      <div className="max-w-full min-w-0 w-full relative overflow-x-hidden">
        {/* ── Loading state ───────────────────────────────────────────── */}
        {showLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex gap-1">
              <span
                className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span className="text-sm text-muted-foreground/80">
              Planning...
            </span>
          </div>
        )}

        {/* ── Error state ─────────────────────────────────────────────── */}
        {!showLoading && isError && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="text-sm text-destructive">
              {message.content || "An error occurred"}
            </div>
          </div>
        )}

        {/* ── Audio response ──────────────────────────────────────────── */}
        {!showLoading && !isError && isAudioResponse && (
          <div className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Volume2 className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="font-medium text-foreground">
                Audio Response
              </span>
              {audioMimeType && (
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted">
                  {audioMimeType}
                </span>
              )}
            </div>
            <audio controls autoPlay src={audioUrl} className="w-full" />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadAudio}
                disabled={isDownloading}
                className="h-6 gap-1 px-2 text-xs text-primary hover:text-primary"
              >
                {isDownloading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                {isDownloading ? "Downloading…" : "Download audio"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (!audioUrl) return;
                  await navigator.clipboard.writeText(audioUrl).catch(() => {});
                  setIsAudioLinkCopied(true);
                  setTimeout(() => setIsAudioLinkCopied(false), 2000);
                }}
                className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Copy audio link"
              >
                {isAudioLinkCopied ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <LinkIcon className="w-3 h-3" />
                )}
                {isAudioLinkCopied ? "Copied!" : "Copy link"}
              </Button>
            </div>
          </div>
        )}

        {/* ── TTS shimmer (audio generating) ─────────────────────────── */}
        {!showLoading &&
          !isError &&
          !isAudioResponse &&
          isStreamActive &&
          !message.content &&
          isTtsRequest && (
            <div className="relative flex items-center gap-2 text-sm py-2 px-3 rounded-lg border bg-card overflow-hidden">
              <div className="absolute inset-0 animate-[audio-shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
              <Volume2 className="w-4 h-4 text-primary flex-shrink-0 relative z-10" />
              <span className="text-muted-foreground relative z-10">
                Generating audio…
              </span>
            </div>
          )}

        {/* ── Text content ────────────────────────────────────────────── */}
        {!showLoading &&
          !isError &&
          !isAudioResponse &&
          !(isStreamActive && !message.content && isTtsRequest) && (
            <>
              {/* DB-loaded tool updates (shown before content) */}
              {hasDbToolUpdates && (
                <Suspense fallback={null}>
                  <ToolCallVisualization
                    toolUpdates={
                      message.toolUpdates as Parameters<
                        typeof ToolCallVisualization
                      >[0]["toolUpdates"]
                    }
                    hasContent={!!message.content}
                    className="mb-2"
                  />
                </Suspense>
              )}

              <div ref={captureRef}>
                {/* Block mode: MarkdownStream with events prop */}
                {hasBlockModeEvents ? (
                  <MarkdownStream
                    content={message.content}
                    events={message.streamEvents}
                    type="message"
                    role="assistant"
                    isStreamActive={
                      isStreamActive && message.status === "streaming"
                    }
                    hideCopyButton={true}
                    allowFullScreenEditor={false}
                    className={markdownClassName}
                  />
                ) : hasStreamEvents ? (
                  /* Normal streaming: interleaved text + tool blocks */
                  <StreamingContentBlocks
                    streamEvents={message.streamEvents!}
                    isStreaming={isStreamActive}
                  />
                ) : (
                  /* DB-loaded or static: plain content */
                  <MarkdownStream
                    content={message.content}
                    taskId={undefined}
                    type="message"
                    role="assistant"
                    isStreamActive={
                      isStreamActive && message.status === "streaming"
                    }
                    hideCopyButton={true}
                    allowFullScreenEditor={false}
                    className={markdownClassName}
                    onContentChange={(newContent) =>
                      onContentChange?.(message.id, newContent)
                    }
                  />
                )}
              </div>

              {/* Action bar — hidden during stream and in overlay mode */}
              {!isStreamActive && !isOverlay && message.content && (
                <div className={`flex items-center ${buttonMargin}`}>
                  <TapTargetButtonTransparent
                    onClick={() => {
                      setIsLiked(!isLiked);
                      if (isDisliked) setIsDisliked(false);
                    }}
                    ariaLabel="Like message"
                    icon={
                      <ThumbsUp
                        className={`w-4 h-4 ${isLiked ? "text-green-500 dark:text-green-400" : "text-muted-foreground"}`}
                      />
                    }
                  />
                  <TapTargetButtonTransparent
                    onClick={() => {
                      setIsDisliked(!isDisliked);
                      if (isLiked) setIsLiked(false);
                    }}
                    ariaLabel="Dislike message"
                    icon={
                      <ThumbsDown
                        className={`w-4 h-4 ${isDisliked ? "text-red-500 dark:text-red-400" : "text-muted-foreground"}`}
                      />
                    }
                  />
                  <TapTargetButtonTransparent
                    onClick={handleCopy}
                    ariaLabel="Copy message"
                    icon={
                      isCopied ? (
                        <Check className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )
                    }
                  />
                  {audioControls && (
                    <TapTargetButtonTransparent
                      onClick={handleSpeakToggle}
                      disabled={!isAudioReady}
                      ariaLabel={isPlaying ? "Pause" : "Read aloud"}
                      icon={
                        isPlaying ? (
                          <Pause className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                        ) : (
                          <Volume2
                            className={`w-4 h-4 ${isPaused ? "text-purple-500 dark:text-purple-400" : "text-muted-foreground"}`}
                          />
                        )
                      }
                    />
                  )}
                  {hasUnsavedChanges && (
                    <TapTargetButtonTransparent
                      onClick={handleQuickSave}
                      disabled={isSaving}
                      ariaLabel="Save changes"
                      icon={
                        isSaving ? (
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 text-primary" />
                        )
                      }
                    />
                  )}
                  {hasHistory && (
                    <TapTargetButtonTransparent
                      onClick={() => setShowHistoryViewer(true)}
                      ariaLabel="View edit history"
                      icon={<History className="w-4 h-4 text-muted-foreground" />}
                    />
                  )}
                  <TapTargetButtonTransparent
                    onClick={handleEditClick}
                    ariaLabel="Edit message"
                    icon={<Edit className="w-4 h-4 text-muted-foreground" />}
                  />
                  <div ref={moreOptionsButtonRef}>
                    <TapTargetButtonTransparent
                      onClick={() => setShowOptionsMenu(true)}
                      ariaLabel="More options"
                      icon={
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      }
                    />
                  </div>

                  {showOptionsMenu && (
                    <Suspense fallback={null}>
                      <ConversationMessageOptionsMenu
                        isOpen={showOptionsMenu}
                        content={message.content}
                        messageId={message.id}
                        sessionId={sessionId}
                        onClose={() => setShowOptionsMenu(false)}
                        onShowHtmlPreview={() => setShowHtmlModal(true)}
                        onEditContent={handleEditClick}
                        onFullPrint={handleFullPrint}
                        onShowHistory={() => setShowHistoryViewer(true)}
                        rawContent={message.rawContent as unknown[]}
                        anchorElement={moreOptionsButtonRef.current}
                      />
                    </Suspense>
                  )}
                </div>
              )}
            </>
          )}
      </div>

      {/* ── Lazy-loaded overlays ───────────────────────────────────────── */}
      {isEditorOpen && (
        <Suspense fallback={null}>
          <FullScreenMarkdownEditor
            isOpen={isEditorOpen}
            initialContent={message.content}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
            tabs={["write", "markdown", "wysiwyg", "preview"]}
            initialTab="write"
          />
        </Suspense>
      )}

      {showHtmlModal && (
        <Suspense fallback={null}>
          <HtmlPreviewFullScreenEditor
            isOpen={showHtmlModal}
            onClose={() => setShowHtmlModal(false)}
            htmlPreviewState={htmlPreviewState}
            title="HTML Preview & Publishing"
            description="Edit markdown, preview HTML, and publish your content"
            messageId={message.id}
          />
        </Suspense>
      )}

      {showHistoryViewer && sessionId && (
        <Suspense fallback={null}>
          <ContentHistoryViewer
            isOpen={showHistoryViewer}
            onClose={() => setShowHistoryViewer(false)}
            sessionId={sessionId}
            messageId={message.id}
          />
        </Suspense>
      )}
    </div>
  );
}

export default AssistantMessage;
