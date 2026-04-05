"use client";

// NoteEditorCore — The single, reusable editor unit for notes.
// Works in ALL contexts: desktop workspace, mobile, floating window, quick notes, embedded panels.
//
// What it owns:
// - Editor mode switching (plain, split, preview, wysiwyg, markdown-split)
// - Textarea ref forwarding (cursor ops, voice input, context menus)
// - Voice input integration
// - Content rendering per mode
//
// What the PARENT owns:
// - Auto-save (hook-based, different debounce per context)
// - Tab/cache management
// - Metadata UI (title, folder, tags)
// - Context menus (wrapped externally)
// - Conflict resolution UI

import React, { useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MatrxSplit } from "@/components/matrx/MatrxSplit";
import { MicrophoneIconButton } from "@/features/audio/components/MicrophoneIconButton";
import type { MarkdownStreamProps } from "@/components/MarkdownStream";
import { cn } from "@/lib/utils";

const MarkdownStream = dynamic<MarkdownStreamProps>(
  () => import("@/components/MarkdownStream"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading preview...
      </div>
    ),
  },
);

const TuiEditorContent = dynamic(
  () =>
    import("@/components/mardown-display/chat-markdown/tui/TuiEditorContent"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    ),
  },
);

// ── Types ────────────────────────────────────────────────────────────────────

export type EditorMode =
  | "plain"
  | "split"
  | "preview"
  | "wysiwyg"
  | "markdown-split";

export interface NoteEditorCoreProps {
  /** Current note content (controlled) */
  content: string;
  /** Called on every content change */
  onChange: (content: string) => void;
  /** Active editor mode */
  editorMode: EditorMode;
  /** Ref to the underlying textarea (plain + split modes). Parent uses for cursor ops. */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** Ref to TUI editor instance (wysiwyg + markdown-split modes) */
  tuiEditorRef?: React.MutableRefObject<any>;
  /** Called when voice transcription completes. If not provided, default inserts at cursor. */
  onVoiceTranscription?: (text: string) => void;
  /** Show the microphone button (top-right overlay) */
  showVoiceButton?: boolean;
  /** Textarea placeholder */
  placeholder?: string;
  /** Additional className for the outer container */
  className?: string;
  /** Disable editing */
  readOnly?: boolean;
  /** Additional className for the textarea element */
  textareaClassName?: string;
  /** Additional className for the preview pane */
  previewClassName?: string;
  /** Sync scroll in split mode (default: true) */
  syncScroll?: boolean;
}

/**
 * NoteEditorCore — The universal note editor.
 *
 * Renders the appropriate editor surface based on `editorMode`.
 * Forwards refs so parents can interact with textarea/TUI for
 * cursor operations, voice input insertion, and context menus.
 */
export function NoteEditorCore({
  content,
  onChange,
  editorMode,
  textareaRef: externalTextareaRef,
  tuiEditorRef: externalTuiRef,
  onVoiceTranscription,
  showVoiceButton = false,
  placeholder = "Start typing your note...",
  className,
  readOnly = false,
  textareaClassName,
  previewClassName,
  syncScroll = true,
}: NoteEditorCoreProps) {
  const internalTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const internalTuiRef = useRef<any>(null);

  // Use external refs if provided, otherwise internal
  const textareaRef = externalTextareaRef || internalTextareaRef;
  const tuiEditorRef = externalTuiRef || internalTuiRef;

  // Keep content ref for voice transcription
  const contentRef = useRef(content);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Default voice transcription: insert at cursor position
  const handleTranscription = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      if (onVoiceTranscription) {
        onVoiceTranscription(text);
        return;
      }

      // Default behavior: insert at textarea cursor
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = contentRef.current.slice(0, start);
        const after = contentRef.current.slice(end);
        const separator =
          before.length > 0 && !before.endsWith("\n") && !before.endsWith(" ")
            ? " "
            : "";
        onChange(before + separator + text + after);
        requestAnimationFrame(() => {
          const newPos = start + separator.length + text.length;
          textarea.selectionStart = newPos;
          textarea.selectionEnd = newPos;
          textarea.focus();
        });
      } else {
        // No textarea (preview/TUI mode) — append
        const separator = contentRef.current.length > 0 ? "\n\n" : "";
        onChange(contentRef.current + separator + text);
      }
    },
    [onVoiceTranscription, onChange, textareaRef],
  );

  // TUI editor change handler
  const handleTuiChange = useCallback(
    (value: string) => {
      onChange(value);
    },
    [onChange],
  );

  return (
    <div className={cn("relative w-full h-full", className)}>
      {/* Voice button overlay */}
      {showVoiceButton && !readOnly && (
        <div className="absolute top-2 right-2 z-10">
          <MicrophoneIconButton
            onTranscriptionComplete={handleTranscription}
            variant="icon-only"
            size="sm"
          />
        </div>
      )}

      {/* ── Plain Text ──────────────────────────────────────────────── */}
      {editorMode === "plain" && (
        <Textarea
          ref={(el) => {
            if (textareaRef && "current" in textareaRef) {
              (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
            }
          }}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={cn(
            "absolute inset-0 w-full h-full resize-none border-0",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "text-sm leading-relaxed bg-transparent p-3 pb-[50vh]",
            textareaClassName,
          )}
        />
      )}

      {/* ── Split View (MatrxSplit) ─────────────────────────────────── */}
      {editorMode === "split" && (
        <MatrxSplit
          value={content}
          onChange={readOnly ? () => {} : onChange}
          textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement | null>}
          placeholder={placeholder}
          className="absolute inset-0"
          syncScroll={syncScroll}
        />
      )}

      {/* ── Preview (Read-Only Markdown) ────────────────────────────── */}
      {editorMode === "preview" && (
        <ScrollArea className="absolute inset-0 w-full h-full">
          <div className={cn("p-6 pb-[50vh] bg-textured", previewClassName)}>
            {content.trim() ? (
              <MarkdownStream content={content} />
            ) : (
              <p className="text-muted-foreground text-sm italic">
                Nothing to preview
              </p>
            )}
          </div>
        </ScrollArea>
      )}

      {/* ── WYSIWYG (TUI Editor) ────────────────────────────────────── */}
      {editorMode === "wysiwyg" && (
        <div className="absolute inset-0 w-full h-full">
          <TuiEditorContent
            ref={tuiEditorRef}
            content={content}
            onChange={handleTuiChange}
            isActive={true}
            editMode="wysiwyg"
            className="w-full h-full"
          />
        </div>
      )}

      {/* ── Markdown Split (TUI Editor in markdown mode) ────────────── */}
      {editorMode === "markdown-split" && (
        <div className="absolute inset-0 w-full h-full">
          <TuiEditorContent
            ref={tuiEditorRef}
            content={content}
            onChange={handleTuiChange}
            isActive={true}
            editMode="markdown"
            className="w-full h-full"
          />
        </div>
      )}
    </div>
  );
}

// ── Helper: Get current content from the right source ────────────────────────

/**
 * Reads the latest content from the appropriate editor surface.
 * Useful for force-save and mode-switch scenarios where TUI state
 * may diverge from the controlled `content` prop.
 */
export function getCurrentEditorContent(
  editorMode: EditorMode,
  content: string,
  tuiEditorRef?: React.MutableRefObject<any>,
): string {
  if (
    (editorMode === "wysiwyg" || editorMode === "markdown-split") &&
    tuiEditorRef?.current?.getCurrentMarkdown
  ) {
    return tuiEditorRef.current.getCurrentMarkdown();
  }
  return content;
}
