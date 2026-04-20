"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAllNotesList,
  selectAllFolders,
  selectNotesListStatus,
  selectNotesByFolder,
} from "@/features/notes/redux/selectors";
import {
  fetchNotesList,
  createNewNote,
  saveNoteField,
} from "@/features/notes/redux/thunks";
import type { Note } from "@/features/notes/types";
import type { NoteRecord } from "@/features/notes/redux/notes.types";
import { useToastManager } from "@/hooks/useToastManager";
import { stripThinking, hasThinkingTags } from "./utils/stripThinking";
import { applyTrim } from "./utils/trimContent";

export type SaveMode = "create" | "update";
export type UpdateMethod = "append" | "overwrite";

export interface UseQuickNoteSaveArgs {
  initialContent: string;
  defaultFolder?: string;
}

function defaultNoteName(): string {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `Quick Note - ${date} at ${time}`;
}

export function useQuickNoteSave({
  initialContent,
  defaultFolder = "Scratch",
}: UseQuickNoteSaveArgs) {
  const dispatch = useAppDispatch();
  const toast = useToastManager("notes");

  const allNotes = useAppSelector(selectAllNotesList);
  const allFolders = useAppSelector(selectAllFolders);
  const listStatus = useAppSelector(selectNotesListStatus);

  useEffect(() => {
    if (listStatus === "idle" || listStatus === "error") {
      dispatch(fetchNotesList());
    }
  }, [listStatus, dispatch]);

  // Transform flags
  const [stripThinkingEnabled, setStripThinkingEnabled] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // User-editable override of the working content (after transforms).
  // null = derive from initialContent + transforms; string = user has edited.
  const [editedContent, setEditedContent] = useState<string | null>(null);

  const basePostTransform = useMemo(() => {
    const stripped = stripThinkingEnabled
      ? stripThinking(initialContent)
      : initialContent;
    return applyTrim(stripped, trimStart, trimEnd);
  }, [initialContent, stripThinkingEnabled, trimStart, trimEnd]);

  const workingContent = editedContent ?? basePostTransform;

  // Reset edited content when source transforms change
  useEffect(() => {
    setEditedContent(null);
  }, [initialContent, stripThinkingEnabled, trimStart, trimEnd]);

  const maxTrim = useMemo(() => {
    const stripped = stripThinkingEnabled
      ? stripThinking(initialContent)
      : initialContent;
    return stripped.length;
  }, [initialContent, stripThinkingEnabled]);

  // Target fields
  const [noteName, setNoteName] = useState(defaultNoteName());
  const [folder, setFolder] = useState(defaultFolder);
  const [mode, setMode] = useState<SaveMode>("create");
  const [selectedNoteId, setSelectedNoteId] = useState<string>("");
  const [updateMethod, setUpdateMethod] = useState<UpdateMethod>("append");

  // Save lifecycle
  const [isSaving, setIsSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<Note | null>(null);

  // Reset selection when folder or mode changes
  useEffect(() => {
    setSelectedNoteId("");
  }, [folder, mode]);

  const notesInFolder = useAppSelector(selectNotesByFolder(folder));

  const selectedNote: NoteRecord | undefined = useMemo(
    () => allNotes.find((n) => n.id === selectedNoteId),
    [allNotes, selectedNoteId],
  );

  const canStripThinking = hasThinkingTags(initialContent);

  const save = useCallback(async (): Promise<Note | null> => {
    if (!workingContent.trim()) {
      toast.error("Content cannot be empty");
      return null;
    }

    setIsSaving(true);
    try {
      if (mode === "create") {
        const note = await dispatch(
          createNewNote({
            label: noteName.trim() || "Quick Note",
            content: workingContent.trim(),
            folder_name: folder,
            tags: [],
          }),
        ).unwrap();
        toast.success(`Created in ${folder}!`);
        setSavedNote(note);
        return note;
      }

      if (!selectedNoteId || !selectedNote) {
        toast.error("Please select a note to update");
        return null;
      }

      const finalContent =
        updateMethod === "append"
          ? `${selectedNote.content ?? ""}\n\n${workingContent.trim()}`.trim()
          : workingContent.trim();

      await dispatch(
        saveNoteField({
          noteId: selectedNoteId,
          field: "content",
          value: finalContent,
        }),
      ).unwrap();

      toast.success(
        `Content ${updateMethod === "append" ? "appended to" : "overwrote"} ${
          selectedNote.label || "note"
        }!`,
      );
      // Build a Note-shaped result for callers
      const result: Note = {
        ...(selectedNote as unknown as Note),
        content: finalContent,
      };
      setSavedNote(result);
      return result;
    } catch (err) {
      console.error("QuickNoteSave: save failed", err);
      toast.error("Failed to save");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [
    dispatch,
    toast,
    mode,
    noteName,
    folder,
    workingContent,
    selectedNoteId,
    selectedNote,
    updateMethod,
  ]);

  const reset = useCallback(() => {
    setStripThinkingEnabled(false);
    setTrimStart(0);
    setTrimEnd(0);
    setEditedContent(null);
    setNoteName(defaultNoteName());
    setFolder(defaultFolder);
    setMode("create");
    setSelectedNoteId("");
    setUpdateMethod("append");
    setSavedNote(null);
    setIsSaving(false);
  }, [defaultFolder]);

  const isSaveDisabled =
    isSaving ||
    !workingContent.trim() ||
    (mode === "update" && !selectedNoteId);

  return {
    // content + transforms
    workingContent,
    setEditedContent,
    stripThinkingEnabled,
    setStripThinkingEnabled,
    canStripThinking,
    trimStart,
    setTrimStart,
    trimEnd,
    setTrimEnd,
    maxTrim,

    // targets
    noteName,
    setNoteName,
    folder,
    setFolder,
    mode,
    setMode,
    selectedNoteId,
    setSelectedNoteId,
    updateMethod,
    setUpdateMethod,
    selectedNote,

    // data
    allFolders,
    notesInFolder,

    // lifecycle
    isSaving,
    isSaveDisabled,
    savedNote,
    save,
    reset,
  };
}
