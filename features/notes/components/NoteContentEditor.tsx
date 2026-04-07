"use client";

// Layer 1: NoteContentEditor
// Takes ONLY a noteId. Manages content ↔ Redux sync with adaptive debounce.
// Uses local useState for instant keystroke response, dispatches to Redux on debounce.
// Includes context menu. Renders via NoteEditorCore internally.
// ZERO PROP DRILLING — reads everything from Redux selectors.

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { updateNoteContent } from "../redux/slice";
import { getReduxSyncDelay } from "../redux/notes.types";
import {
  selectNoteContent,
  selectNoteEditorMode,
  selectNoteIsDirtyById,
  selectNoteFolder,
  selectAllFolders,
} from "../redux/selectors";
import { NoteEditorCore, type EditorMode } from "./NoteEditorCore";

// Lazy load the context menu (heavy: AI, Redux, modals)
const NoteContextMenu = dynamic(
  () => import("@/app/(ssr)/ssr/notes/_components/NoteContextMenu"),
  { ssr: false },
);

interface NoteContentEditorProps {
  noteId: string;
}

export function NoteContentEditor({ noteId }: NoteContentEditorProps) {
  const dispatch = useAppDispatch();

  // ── Read from Redux (memoized selectors — no new references) ────────
  const reduxContentRaw = useAppSelector(selectNoteContent(noteId));
  const reduxContent = reduxContentRaw ?? "";
  const editorModeRaw = useAppSelector(selectNoteEditorMode(noteId));
  const editorMode = (editorModeRaw ?? "plain") as EditorMode;
  const isDirty = useAppSelector(selectNoteIsDirtyById(noteId));
  const allFolders = useAppSelector(selectAllFolders);
  const currentFolderRaw = useAppSelector(selectNoteFolder(noteId));
  const currentFolder = currentFolderRaw ?? "Draft";

  // ── Local state for instant keystroke response ───────────────────────
  // React can't re-render from Redux fast enough for every keystroke.
  // We mirror content locally and debounce sync to Redux.
  const [localContent, setLocalContent] = useState(reduxContent);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReduxContentRef = useRef(reduxContent);

  // ── Sync Redux → local when Redux changes externally ─────────────────
  // (e.g., undo/redo, realtime update, version restore)
  useEffect(() => {
    // Only update local if Redux content changed from an external source
    // (not from our own dispatch — which we track via lastReduxContentRef)
    if (reduxContent !== lastReduxContentRef.current) {
      lastReduxContentRef.current = reduxContent;
      setLocalContent(reduxContent);
    }
  }, [reduxContent]);

  // ── Sync local → Redux on debounce ───────────────────────────────────
  const syncToRedux = useCallback(
    (content: string) => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

      const delay = getReduxSyncDelay(content.length);
      syncTimerRef.current = setTimeout(() => {
        lastReduxContentRef.current = content;
        dispatch(updateNoteContent({ id: noteId, content }));
        // Auto-save middleware will pick this up and schedule DB write
      }, delay);
    },
    [dispatch, noteId],
  );

  // ── Handle content changes from the editor ───────────────────────────
  const handleChange = useCallback(
    (content: string) => {
      setLocalContent(content);
      syncToRedux(content);
    },
    [syncToRedux],
  );

  // ── Flush on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        // Flush the last content to Redux synchronously
        // Can't dispatch in cleanup, but the auto-save middleware
        // will catch the dirty state on next opportunity
      }
    };
  }, []);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <NoteContextMenu
      noteId={noteId}
      isDirty={isDirty}
      allFolders={allFolders}
      currentFolder={currentFolder}
      noteContent={localContent}
      textareaRef={textareaRef}
      onSave={() => {
        // Flush local to Redux immediately
        lastReduxContentRef.current = localContent;
        dispatch(updateNoteContent({ id: noteId, content: localContent }));
      }}
      onDuplicate={() => {}}
      onExport={() => {}}
      onShareLink={() => {}}
      onShareClipboard={() => {}}
      onMove={() => {}}
      onCloseTab={() => {}}
      onCloseOtherTabs={() => {}}
      onCloseAllTabs={() => {}}
      onDelete={() => {}}
    >
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <NoteEditorCore
          content={localContent}
          onChange={handleChange}
          editorMode={editorMode}
          textareaRef={textareaRef}
          showVoiceButton={editorMode !== "preview"}
          placeholder="Start typing..."
          className="flex-1 min-h-0"
        />
      </div>
    </NoteContextMenu>
  );
}
