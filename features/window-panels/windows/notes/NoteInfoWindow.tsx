// record-view: note
/**
 * features/window-panels/windows/notes/NoteInfoWindow.tsx
 *
 * Floating WindowPanel that shows everything about a single note in one
 * place — content stats (words / characters / lines / reading time),
 * timestamps + version, folder, the full hierarchy context picker, tags,
 * and identifiers. Opened from the note tab's info icon.
 *
 * The window is a thin shell around the canonical NoteInfoPanel (so the
 * same surface can be embedded elsewhere). It is ephemeral — it is tied to
 * whichever note the user clicked, so there is nothing meaningful to
 * restore across reloads.
 *
 * Right-click surface: this window names exactly one identity (the note it
 * inspects), so it wears the SAME note menu the sidebar row and tab use
 * (`buildNoteContextSections`, features/context-menu-host/SECTIONS.md) rather
 * than a bespoke set of actions.
 */

"use client";

import React, { useState } from "react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { NoteInfoPanel } from "@/features/notes/components/NoteInfoPanel";
import { HomePickerDialog } from "@/features/notes/homes/HomePicker";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import type { ContentSource } from "@ai-matrx/rich-content/rich-document/types";
import { noteIdentityContentSource } from "@/features/notes/richDocumentSource";
import {
  buildNoteContextSections,
  displayLabel,
} from "@/features/notes/components/note-actions/noteMenuRegistry";
import { withAvailability } from "@ai-matrx/context-menu/engine";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectNoteById,
  selectNoteContent,
} from "@/features/notes/redux/selectors";
import { useOpenNoteKnowledgePanel } from "@/features/notes/canvas/noteKnowledgeKind";
import { useOpenNotesWindow } from "@/features/overlays/openers/notesWindow";

export interface NoteInfoWindowProps {
  isOpen: boolean;
  onClose: () => void;
  /** The note to inspect. Falls back to the registry default (null). */
  noteId?: string | null;
  /** Optional title override (e.g. the note label) for the window header. */
  title?: string | null;
}

export default function NoteInfoWindow({
  isOpen,
  onClose,
  noteId,
  title,
}: NoteInfoWindowProps) {
  if (!isOpen || !noteId) return null;

  return (
    <NoteInfoWindowInner noteId={noteId} onClose={onClose} title={title} />
  );
}

function NoteInfoWindowInner({
  noteId,
  onClose,
  title,
}: {
  noteId: string;
  onClose: () => void;
  title?: string | null;
}) {
  const dispatch = useAppDispatch();
  const note = useAppSelector(selectNoteById(noteId));
  const content = useAppSelector(selectNoteContent(noteId));
  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const openKnowledge = useOpenNoteKnowledgePanel();
  const openNotesWindow = useOpenNotesWindow();

  const label = title || note?.label || "Untitled";

  // This window has no notes-tab instance of its own (it's an info-only
  // shell opened from wherever the note already lives), so "Open" spawns
  // the canonical Notes window on this note instead of switching a tab, and
  // "Move to…" opens the one home picker.
  const sections = withAvailability(
    buildNoteContextSections({
      instanceId: "",
      noteId,
      label,
      content,
      openKnowledge,
      onMoveToHome: () => setMovePickerOpen(true),
      dispatch,
      onOpen: () => openNotesWindow({ initialNoteId: noteId }),
    })[0],
    {},
  );

  return (
    <WindowPanel
      title={title || "Note info"}
      width={400}
      height={620}
      minWidth={320}
      minHeight={360}
      onClose={onClose}
      overlayId="noteInfoWindow"
      onCollectData={() => ({ noteId, title: title ?? undefined })}
      bodyClassName="overflow-y-auto"
    >
      {/*
       * context-menu-exempt: surfaceName — this info-only shell never
       * publishes the matrx-user/notes SurfaceRuntimeProvider (the editor
       * window does); passing it here would light up value mappings this
       * pane cannot back.
       */}
      <NonEditableContextMenu
        sourceFeature="notes"
        contextData={{ content: content ?? "" }}
        contentSource={noteIdentityContentSource(noteId, `note-info:${noteId}`)}
        entity={{
          type: "note",
          id: noteId,
          title: displayLabel(label),
          resourceType: "note",
        }}
        extraSections={[sections]}
      >
        <div className="min-h-full">
          <NoteInfoPanel noteId={noteId} />
        </div>
      </NonEditableContextMenu>
      <HomePickerDialog open={movePickerOpen} onOpenChange={setMovePickerOpen} noteIds={[noteId]} />
    </WindowPanel>
  );
}
