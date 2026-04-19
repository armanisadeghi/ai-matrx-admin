"use client";

import React, { useRef, useCallback, useState } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import MarkdownStream, {
  type MarkdownStreamProps,
} from "@/components/MarkdownStream";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Eye, PenLine } from "lucide-react";

export interface MatrxSplitProps {
  /** The markdown content to edit and preview */
  value: string;
  /** Called with the new string value whenever the editor content changes */
  onChange: (value: string) => void;
  /** Optional ref forwarded to the underlying <textarea> element */
  textareaRef?: React.Ref<HTMLTextAreaElement>;
  /** Placeholder text shown when the editor is empty */
  placeholder?: string;
  /** Extra className applied to the outer ResizablePanelGroup */
  className?: string;
  /** Initial panel sizes as [leftPercent, rightPercent]. Defaults to [50, 50] */
  defaultLayout?: [number, number];
  /** Extra className for the textarea panel's inner element */
  textareaClassName?: string;
  /** Extra className for the preview panel's inner element */
  previewClassName?: string;
  /** Hide the copy button inside MarkdownStream. Defaults to true */
  hideCopyButton?: boolean;
  /** Message shown in the preview panel when value is empty */
  emptyPreviewMessage?: string;
  /** Enable proportional scroll sync between editor and preview. Defaults to true */
  syncScroll?: boolean;
  /** Passed to MarkdownStream preview (e.g. structured blocks in message context) */
  analysisData?: MarkdownStreamProps["analysisData"];
  messageId?: string;
  allowFullScreenEditor?: boolean;
  /** Extra className on the MarkdownStream in the preview pane */
  previewMarkdownClassName?: string;
  /**
   * Called when an edit originates inside the preview pane's MarkdownStream
   * (full-screen editor, block edits, etc.). Receives the full updated
   * markdown. If omitted, defaults to `onChange` so the editor and preview
   * stay in lockstep — which is the correct behavior for any consumer that
   * treats the textarea value and the preview as the same document.
   *
   * Pass a distinct handler only when you need to flush synchronously on
   * preview-originated edits (e.g. to skip a debounce) — keystroke edits
   * still go through `onChange`.
   */
  onPreviewChange?: (value: string) => void;
}

/**
 * Assign a DOM node to a React ref (callback or object form).
 * Used to merge the external textareaRef with the internal one.
 */
function setRef<T>(ref: React.Ref<T> | undefined, node: T | null) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(node);
  } else {
    (ref as React.MutableRefObject<T | null>).current = node;
  }
}

/**
 * MatrxSplit — a resizable two-pane editor/preview component.
 * Left pane: plain textarea for writing markdown.
 * Right pane: live MarkdownStream preview.
 * Draggable divider courtesy of react-resizable-panels.
 *
 * When `syncScroll` is enabled (default), scrolling either pane
 * proportionally scrolls the other, so both stay at the same
 * relative position even when their content heights differ.
 */
export function MatrxSplit({
  value,
  onChange,
  textareaRef,
  placeholder = "Start writing...",
  className,
  defaultLayout = [50, 50],
  textareaClassName,
  previewClassName,
  hideCopyButton = true,
  emptyPreviewMessage = "Nothing to preview",
  syncScroll = true,
  analysisData,
  messageId,
  allowFullScreenEditor,
  previewMarkdownClassName,
  onPreviewChange,
}: MatrxSplitProps) {
  const previewChange = onPreviewChange ?? onChange;
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");

  const internalTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const isSyncing = useRef(false);

  const mergedTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      internalTextareaRef.current = node;
      setRef(textareaRef, node);
    },
    [textareaRef],
  );

  const handleEditorScroll = useCallback(() => {
    if (!syncScroll || isSyncing.current) return;
    const editor = internalTextareaRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;

    const maxScroll = editor.scrollHeight - editor.clientHeight;
    if (maxScroll <= 0) return;

    const pct = editor.scrollTop / maxScroll;
    const previewMax = preview.scrollHeight - preview.clientHeight;

    isSyncing.current = true;
    preview.scrollTop = pct * previewMax;
    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  }, [syncScroll]);

  const handlePreviewScroll = useCallback(() => {
    if (!syncScroll || isSyncing.current) return;
    const editor = internalTextareaRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;

    const maxScroll = preview.scrollHeight - preview.clientHeight;
    if (maxScroll <= 0) return;

    const pct = preview.scrollTop / maxScroll;
    const editorMax = editor.scrollHeight - editor.clientHeight;

    isSyncing.current = true;
    editor.scrollTop = pct * editorMax;
    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  }, [syncScroll]);

  if (isMobile) {
    return (
      <div
        className={cn("flex flex-col h-full w-full overflow-hidden", className)}
      >
        {/* Mode toggle bar */}
        <div className="flex-shrink-0 flex items-center border-b border-border bg-card">
          <button
            type="button"
            onClick={() => setMobileView("edit")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
              mobileView === "edit"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <PenLine className="h-4 w-4" />
            Edit
          </button>
          <div className="w-px h-6 bg-border" />
          <button
            type="button"
            onClick={() => setMobileView("preview")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
              mobileView === "preview"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
        </div>

        {/* Content area — single scroll region, no nesting */}
        <div className="flex-1 overflow-hidden relative">
          {mobileView === "edit" ? (
            <textarea
              ref={mergedTextareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              aria-label="Markdown editor"
              className={cn(
                "h-full w-full resize-none border-none bg-transparent p-4 leading-[1.7] font-[inherit] text-foreground outline-none placeholder:text-muted-foreground overflow-y-auto scrollbar-thin-auto",
                textareaClassName,
              )}
              style={{ fontSize: "16px" }}
            />
          ) : (
            <div
              ref={previewRef}
              className={cn(
                "h-full overflow-y-auto py-2 px-4 pb-safe scrollbar-thin-auto",
                previewClassName,
              )}
            >
              {value.trim() ? (
                <MarkdownStream
                  content={value}
                  isStreamActive={false}
                  hideCopyButton={hideCopyButton}
                  analysisData={analysisData}
                  messageId={messageId}
                  allowFullScreenEditor={allowFullScreenEditor}
                  className={previewMarkdownClassName}
                  onContentChange={previewChange}
                />
              ) : (
                <p className="py-2 text-sm italic text-muted-foreground">
                  {emptyPreviewMessage}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className={cn("h-full w-full", className)}
    >
      <ResizablePanel defaultSize={defaultLayout[0]} minSize={20}>
        <textarea
          ref={mergedTextareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleEditorScroll}
          placeholder={placeholder}
          aria-label="Markdown editor"
          className={cn(
            "h-full w-full resize-none border-none bg-transparent p-4 text-sm leading-[1.7] font-[inherit] text-foreground outline-none placeholder:text-muted-foreground overflow-y-auto scrollbar-thin-auto",
            textareaClassName,
          )}
        />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={defaultLayout[1]} minSize={20}>
        <div
          ref={previewRef}
          onScroll={handlePreviewScroll}
          className={cn(
            "h-full overflow-y-auto py-2 px-5 scrollbar-thin-auto",
            previewClassName,
          )}
        >
          {value.trim() ? (
            <MarkdownStream
              content={value}
              isStreamActive={false}
              hideCopyButton={hideCopyButton}
              analysisData={analysisData}
              messageId={messageId}
              allowFullScreenEditor={allowFullScreenEditor}
              className={previewMarkdownClassName}
              onContentChange={previewChange}
            />
          ) : (
            <p className="py-2 text-sm italic text-muted-foreground">
              {emptyPreviewMessage}
            </p>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
