"use client";

/**
 * Lightweight hover preview for a single note, drawn by THE Peek. Reads from Redux directly —
 * no fetch — because notes referenced in a message are essentially always
 * already in the notes slice once the user has interacted with them.
 */

import { Peek, PeekHoverCard, type PeekRecord } from "@ai-matrx/design-system";
import { StickyNote } from "lucide-react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectNoteById } from "@/features/notes/redux/selectors";
import { useNoteHomes } from "@/features/notes/homes/useNoteHomes";
import { formatDateTime } from "./peek-lines";

const CONTENT_PREVIEW_CHARS = 600;

interface NotePreviewContentProps {
  noteId: string;
  onOpen?: () => void;
  /** `surface` when this is the card itself (a hover), `bare` inside a panel that already frames it. */
  frame?: "surface" | "bare";
}

export function NotePreviewContent({ noteId, onOpen, frame = "bare" }: NotePreviewContentProps) {
  const note = useAppSelector(selectNoteById(noteId));
  const homeLabel = useNoteHomes().labelOf(note?.home_scope_id);

  if (!note) {
    return <Peek frame={frame} record={{ kind: "Note", id: noteId, title: "Note not loaded", copyData: false }} />;
  }

  const content = note.content ?? "";
  const truncated =
    content.length > CONTENT_PREVIEW_CHARS ? content.slice(0, CONTENT_PREVIEW_CHARS).trimEnd() + "…" : content;

  const record: PeekRecord = {
    kind: "Note",
    id: noteId,
    title: note.label?.trim() || "Untitled",
    glyph: StickyNote,
    body: [
      ...(homeLabel ? [{ property: "Home", value: homeLabel }] : []),
      truncated.trim()
        ? { section: "Note", text: truncated, breaks: true }
        : { fact: "Empty note", muted: true },
      { fact: `Updated ${formatDateTime(note.updated_at)}`, muted: true },
    ],
    // Copy hands Alchemy the full note text (the old Copy button copied the whole note, not the preview).
    copyData: content ? content : false,
    ...(onOpen ? { primary: { label: "Open", onSelect: onOpen } } : { href: `/notes/${noteId}` }),
  };
  return <Peek frame={frame} record={record} />;
}

interface NoteHoverPreviewProps {
  noteId: string;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  onOpen?: () => void;
}

export function NoteHoverPreview({ noteId, children, side = "top", align = "start", onOpen }: NoteHoverPreviewProps) {
  return (
    <PeekHoverCard trigger={children} side={side} align={align} label="Note">
      <NotePreviewContent noteId={noteId} onOpen={onOpen} frame="surface" />
    </PeekHoverCard>
  );
}
