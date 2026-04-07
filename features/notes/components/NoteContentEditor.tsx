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

const NoteContextMenu = dynamic(
  () => import("@/app/(ssr)/ssr/notes/_components/NoteContextMenu"),
  { ssr: false },
);

interface NoteContentEditorProps {
  noteId: string;
}

export function NoteContentEditor({ noteId }: NoteContentEditorProps) {
  const dispatch = useAppDispatch();

  // ── Redux selectors (cached — stable references) ──────────────────
  const reduxContent = useAppSelector(selectNoteContent(noteId)) ?? "";
  const editorMode = (useAppSelector(selectNoteEditorMode(noteId)) ?? "plain") as EditorMode;
  const isDirty = useAppSelector(selectNoteIsDirtyById(noteId));
  const allFolders = useAppSelector(selectAllFolders);
  const currentFolder = useAppSelector(selectNoteFolder(noteId)) ?? "Draft";

  // ── Local content state — initialized from Redux, synced back on debounce
  const [localContent, setLocalContent] = useState(reduxContent);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReduxRef = useRef(reduxContent);
  const noteIdRef = useRef(noteId);

  // ── When noteId changes, reset local content from Redux immediately
  if (noteId !== noteIdRef.current) {
    noteIdRef.current = noteId;
    lastReduxRef.current = reduxContent;
    setLocalContent(reduxContent);
  }

  // ── When Redux content changes externally (undo, realtime, fetch completion)
  // update local state — but NOT if we caused the change ourselves
  if (reduxContent !== lastReduxRef.current) {
    lastReduxRef.current = reduxContent;
    // Only update local if the change came from outside (not our own dispatch)
    // We detect this by checking if local content differs from the new Redux content
    // AND we don't have a pending sync timer (which means we're the ones who changed it)
    if (!syncTimerRef.current) {
      setLocalContent(reduxContent);
    }
  }

  // ── Debounced sync: local → Redux ─────────────────────────────────
  const syncToRedux = useCallback(
    (content: string) => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

      const delay = getReduxSyncDelay(content.length);
      syncTimerRef.current = setTimeout(() => {
        syncTimerRef.current = null;
        lastReduxRef.current = content;
        dispatch(updateNoteContent({ id: noteId, content }));
      }, delay);
    },
    [dispatch, noteId],
  );

  const handleChange = useCallback(
    (content: string) => {
      setLocalContent(content);
      syncToRedux(content);
    },
    [syncToRedux],
  );

  // ── Cleanup timer on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <NoteContextMenu
      noteId={noteId}
      isDirty={isDirty}
      allFolders={allFolders}
      currentFolder={currentFolder}
      noteContent={localContent}
      textareaRef={textareaRef}
      onSave={() => {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
        lastReduxRef.current = localContent;
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
