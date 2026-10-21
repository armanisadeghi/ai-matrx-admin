"use client";

// WHERE A FULL-PAGE NOTE EDITOR'S MIC + "…" LIVE when no tab carries them (2026-10-20).
//
// Pinned to the plain-text box's corner they sat on the scrolling note text. The notes view owns
// one slot in its bottom bar (NoteMetadataBar registers it) for the note it shows, and the editor
// for THAT note draws its controls there (ProTextarea `controlsHost`). Where a tab carries the
// note's mic and "…" (the Notes page tab strip, NoteWorkspace) the editor draws none at all.

import { createContext, useContext } from "react";

export interface NoteEditorControlsSlot {
  /** The note whose editor may use the slot. */
  noteId: string | null;
  el: HTMLElement | null;
  register: (el: HTMLElement | null) => void;
}

export const NoteEditorControlsSlotContext = createContext<NoteEditorControlsSlot | null>(null);

/** The bar element this note's editor draws its controls into, or null (none offered). */
export function useNoteEditorControlsHost(noteId: string): HTMLElement | null {
  const slot = useContext(NoteEditorControlsSlotContext);
  return slot && slot.noteId === noteId ? slot.el : null;
}

/** The ref callback a bottom bar showing this note mounts its slot with (undefined: no slot). */
export function useNoteEditorControlsRegister(noteId: string): ((el: HTMLElement | null) => void) | undefined {
  const slot = useContext(NoteEditorControlsSlotContext);
  return slot && slot.noteId === noteId ? slot.register : undefined;
}
