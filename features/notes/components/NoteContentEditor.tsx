"use client";

// Layer 1: NoteContentEditor
// Takes ONLY a noteId. Manages content <-> Redux sync with adaptive debounce.
// Uses local useState for instant keystroke response, dispatches to Redux on debounce.
// Includes context menu. Renders via NoteEditorCore internally.
// ZERO PROP DRILLING — reads everything from Redux selectors + NotesInstanceContext.

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  updateNoteContent,
  removeInstanceTab,
} from "../redux/slice";
import { getReduxSyncDelay } from "../redux/notes.types";
import {
  selectNoteContent,
  selectNoteEditorMode,
  selectNoteIsDirtyById,
  selectNoteFolder,
  selectNoteLabel,
  selectAllFolders,
  selectInstanceTabs,
} from "../redux/selectors";
import { saveNote, copyNote, deleteNote, moveNoteToFolder } from "../redux/thunks";
import { useNotesInstanceId } from "../context/NotesInstanceContext";
import { NoteEditorCore, type EditorMode } from "./NoteEditorCore";
import { MoveNoteDialog } from "./MoveNoteDialog";
import { ShareNoteDialog } from "./ShareNoteDialog";

const NoteContextMenu = dynamic(
  () => import("@/app/(ssr)/ssr/notes/_components/NoteContextMenu"),
  { ssr: false },
);

interface NoteContentEditorProps {
  noteId: string;
}

export function NoteContentEditor({ noteId }: NoteContentEditorProps) {
  const dispatch = useAppDispatch();
  const instanceId = useNotesInstanceId();

  // ── Redux selectors (cached — stable references) ──────────────────
  const reduxContent = useAppSelector(selectNoteContent(noteId)) ?? "";
  const editorMode = (useAppSelector(selectNoteEditorMode(noteId)) ?? "plain") as EditorMode;
  const isDirty = useAppSelector(selectNoteIsDirtyById(noteId));
  const allFolders = useAppSelector(selectAllFolders);
  const currentFolder = useAppSelector(selectNoteFolder(noteId)) ?? "Draft";
  const noteLabel = useAppSelector(selectNoteLabel(noteId)) ?? "Untitled";
  const openTabs = useAppSelector(selectInstanceTabs(instanceId));

  // ── Dialog state ──────────────────────────────────────────────────
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

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
    if (!syncTimerRef.current) {
      setLocalContent(reduxContent);
    }
  }

  // ── Debounced sync: local -> Redux ─────────────────────────────────
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

  // ── Context menu handlers ─────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = null;
    lastReduxRef.current = localContent;
    dispatch(updateNoteContent({ id: noteId, content: localContent }));
    dispatch(saveNote(noteId));
  }, [dispatch, noteId, localContent]);

  const handleDuplicate = useCallback(() => {
    dispatch(copyNote(noteId));
  }, [dispatch, noteId]);

  const handleExport = useCallback(() => {
    const blob = new Blob([localContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${noteLabel}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [localContent, noteLabel]);

  const handleShareLink = useCallback(() => {
    setShareDialogOpen(true);
  }, []);

  const handleShareClipboard = useCallback(() => {
    navigator.clipboard.writeText(localContent).catch(() => {});
  }, [localContent]);

  const handleMove = useCallback(() => {
    setMoveDialogOpen(true);
  }, []);

  const handleMoveConfirm = useCallback(
    (targetFolder: string) => {
      dispatch(moveNoteToFolder({ noteId, folder: targetFolder }));
    },
    [dispatch, noteId],
  );

  const handleCloseTab = useCallback(() => {
    dispatch(removeInstanceTab({ instanceId, noteId }));
  }, [dispatch, instanceId, noteId]);

  const handleCloseOtherTabs = useCallback(() => {
    if (!openTabs) return;
    for (const tabId of openTabs) {
      if (tabId !== noteId) {
        dispatch(removeInstanceTab({ instanceId, noteId: tabId }));
      }
    }
  }, [dispatch, instanceId, noteId, openTabs]);

  const handleCloseAllTabs = useCallback(() => {
    if (!openTabs) return;
    for (const tabId of openTabs) {
      dispatch(removeInstanceTab({ instanceId, noteId: tabId }));
    }
  }, [dispatch, instanceId, openTabs]);

  const handleDelete = useCallback(() => {
    dispatch(removeInstanceTab({ instanceId, noteId }));
    dispatch(deleteNote(noteId));
  }, [dispatch, instanceId, noteId]);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      <NoteContextMenu
        noteId={noteId}
        isDirty={isDirty}
        allFolders={allFolders}
        currentFolder={currentFolder}
        noteContent={localContent}
        textareaRef={textareaRef}
        onSave={handleSave}
        onDuplicate={handleDuplicate}
        onExport={handleExport}
        onShareLink={handleShareLink}
        onShareClipboard={handleShareClipboard}
        onMove={handleMove}
        onCloseTab={handleCloseTab}
        onCloseOtherTabs={handleCloseOtherTabs}
        onCloseAllTabs={handleCloseAllTabs}
        onDelete={handleDelete}
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

      <MoveNoteDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        onConfirm={handleMoveConfirm}
        noteName={noteLabel}
        currentFolder={currentFolder}
        availableFolders={allFolders}
      />

      <ShareNoteDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        noteId={noteId}
        noteLabel={noteLabel}
      />
    </>
  );
}
