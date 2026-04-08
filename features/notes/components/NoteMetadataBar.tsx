"use client";

// Layer 2: NoteMetadataBar
// Shows folder, tags, save status, word count.
// Title is handled by the tab (Layer 3) — NOT duplicated here.
// Props: noteId only. Everything from Redux.

import React, { useState, useCallback, useMemo } from "react";
import { FolderOpen, ChevronDown, X, Plus } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  updateNoteFolder,
  updateNoteTags,
} from "../redux/slice";
import {
  selectNoteFolder,
  selectNoteTags,
  selectNoteIsDirtyById,
  selectNoteIsSavingById,
  selectNoteContent,
  selectAllFolders,
} from "../redux/selectors";
import { cn } from "@/lib/utils";

interface NoteMetadataBarProps {
  noteId: string;
}

export function NoteMetadataBar({ noteId }: NoteMetadataBarProps) {
  const dispatch = useAppDispatch();

  const folder = useAppSelector(selectNoteFolder(noteId)) ?? "Draft";
  const tags = useAppSelector(selectNoteTags(noteId)) ?? [];
  const isDirty = useAppSelector(selectNoteIsDirtyById(noteId));
  const isSaving = useAppSelector(selectNoteIsSavingById(noteId));
  const content = useAppSelector(selectNoteContent(noteId)) ?? "";
  const allFolders = useAppSelector(selectAllFolders);

  const [folderOpen, setFolderOpen] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const wordCount = useMemo(() => {
    const trimmed = content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [content]);

  const saveStatus = isSaving ? "Saving..." : isDirty ? "Unsaved" : "Saved";
  const statusColor = isSaving
    ? "text-yellow-500"
    : isDirty
      ? "text-amber-500"
      : "text-green-500";

  const handleFolderChange = useCallback(
    (f: string) => {
      dispatch(updateNoteFolder({ id: noteId, folder: f }));
      setFolderOpen(false);
    },
    [dispatch, noteId],
  );

  const handleRemoveTag = useCallback(
    (tag: string) => {
      dispatch(updateNoteTags({ id: noteId, tags: tags.filter((t) => t !== tag) }));
    },
    [dispatch, noteId, tags],
  );

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      dispatch(updateNoteTags({ id: noteId, tags: [...tags, trimmed] }));
    }
    setTagInput("");
    setAddingTag(false);
  }, [dispatch, noteId, tags, tagInput]);

  return (
    <div className="flex items-center gap-2 py-1 px-4 border-t border-border/20 shrink-0 overflow-hidden min-h-[1.625rem]">
      {/* Folder selector */}
      <div className="relative shrink-0">
        <button
          onClick={() => setFolderOpen((v) => !v)}
          className="flex items-center gap-1 text-[0.625rem] text-muted-foreground hover:text-foreground cursor-pointer transition-colors [&_svg]:w-3 [&_svg]:h-3"
        >
          <FolderOpen />
          <span className="max-w-[80px] truncate">{folder}</span>
          <ChevronDown className="w-2! h-2! opacity-50" />
        </button>
        {folderOpen && (
          <div className="absolute left-0 bottom-full mb-1 z-50 min-w-[120px] max-h-[200px] overflow-auto py-1 bg-card/95 backdrop-blur-2xl border border-border rounded-lg shadow-lg">
            {allFolders.map((f) => (
              <button
                key={f}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-[0.625rem] cursor-pointer transition-colors",
                  f === folder
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-accent",
                )}
                onClick={() => handleFolderChange(f)}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[0.5625rem] bg-muted rounded-full text-muted-foreground shrink-0"
          >
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="cursor-pointer hover:text-foreground [&_svg]:w-2 [&_svg]:h-2"
            >
              <X />
            </button>
          </span>
        ))}
        {addingTag ? (
          <input
            autoFocus
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddTag();
              if (e.key === "Escape") { setAddingTag(false); setTagInput(""); }
            }}
            onBlur={handleAddTag}
            className="w-16 px-1 py-0.5 text-[0.5625rem] bg-muted rounded border border-border outline-none shrink-0"
            placeholder="tag..."
            style={{ fontSize: "16px" }}
          />
        ) : (
          <button
            onClick={() => setAddingTag(true)}
            className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer [&_svg]:w-2.5 [&_svg]:h-2.5 shrink-0"
          >
            <Plus />
          </button>
        )}
      </div>

      {/* Status + word count */}
      <span className={cn("text-[0.5625rem] shrink-0", statusColor)}>
        {saveStatus}
      </span>
      <span className="text-[0.5625rem] text-muted-foreground/50 shrink-0">
        {wordCount}w
      </span>
    </div>
  );
}
