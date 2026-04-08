"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectNoteById,
  selectNoteContent,
  selectNoteLabel,
} from "../../redux/selectors";
import type { NoteViewMode } from "../../types";

interface NoteEditorPlaceholderProps {
  noteId: string;
  mode: NoteViewMode;
}

/**
 * Temporary placeholder for the real editor components.
 * Reads from Redux (already hydrated by NoteHydrator in the layout).
 * Replace each mode with the real editor implementation.
 *
 * TODO:
 *   edit    → markdown editor (CodeMirror / Monaco)
 *   split   → editor + preview side-by-side (this is the right panel companion)
 *   rich    → rich-text editor (TipTap / Lexical)
 *   md      → raw markdown source view
 *   preview → rendered markdown read-only view
 *   diff    → version diff viewer
 */
export function NoteEditorPlaceholder({
  noteId,
  mode,
}: NoteEditorPlaceholderProps) {
  const note = useAppSelector(selectNoteById(noteId));
  const label = useAppSelector(selectNoteLabel(noteId));
  const content = useAppSelector(selectNoteContent(noteId));

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground">Loading note…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mode indicator — remove when real editor is in place */}
      <div className="h-8 shrink-0 flex items-center gap-2 px-4 border-b border-border bg-muted/10">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {mode} mode
        </span>
        <span className="text-[10px] text-muted-foreground/50">
          — editor stub
        </span>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <h1 className="text-xl font-semibold text-foreground mb-4">
          {label ?? "Untitled"}
        </h1>
        <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-words">
          {content ?? "(empty)"}
        </pre>
      </div>
    </div>
  );
}
