"use client";

// useNoteHostHistory — the note's record history under the one editor's own (review 2026-10-19 #7).
// Write's own undo history starts empty every time its view mounts (Plain → Write, Write ↔ Source).
// Registered on the editor's container, the note's history answers the toolbar's Undo / Redo when
// the view has nothing to take back — the same rule ⌘Z follows in useNoteUndoRedo.

import { useEffect, type RefObject } from "react";
import { registerHostHistory } from "@ai-matrx/rich-content/editor/format/format-target";

export function useNoteHostHistory(
  rootRef: RefObject<Element | null>,
  undo: () => void,
  redo: () => void,
): void {
  useEffect(() => {
    const root = rootRef.current;
    return root ? registerHostHistory(root, { undo, redo }) : undefined;
  }, [rootRef, undo, redo]);
}
