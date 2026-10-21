"use client";

// features/notes/homes/useMoveNoteShortcut.ts
//
// Ctrl/⌘+Shift+M — move the active note (opens the home picker). Listened for in the CAPTURE
// phase and stopped there: the rich editor binds the same keys to "insert equation", and a
// bubble-phase window listener ran only after the editor had already put an equation into the
// note (walk 2026-10-21: the picker opened AND the note gained "$x$").

import { useEffect, type RefObject } from "react";
import { surfaceOwnsKey } from "@ai-matrx/kit/keyboard-scope";

export function isMoveNoteShortcut(e: Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "shiftKey" | "altKey" | "key">): boolean {
  return (e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === "m";
}

export function useMoveNoteShortcut(
  rootRef: RefObject<HTMLElement | null>,
  activeNoteId: string | null | undefined,
  onMove: (noteId: string) => void,
): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isMoveNoteShortcut(e)) return;
      if (!surfaceOwnsKey(e, rootRef.current)) return;
      e.preventDefault();
      e.stopPropagation();
      if (activeNoteId) onMove(activeNoteId);
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [rootRef, activeNoteId, onMove]);
}
