"use client";

// Layer 2: NoteMetadataBar
// Takes ONLY a noteId. Shows title, folder, tags, save status, word count.
// All reads from Redux selectors. All writes via dispatch.
// ZERO PROP DRILLING.

import React, { useState, useRef, useCallback, useMemo } from "react";
import { FolderOpen, ChevronDown, Tag, X, Plus } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  updateNoteLabel,
  updateNoteFolder,
  updateNoteTags,
} from "../redux/slice";
import {
  selectNoteLabel,
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

  // ── Redux selectors (memoized — no new references) ─────────────────
  const label = useAppSelector(selectNoteLabel(noteId));
  const folder = useAppSelector(selectNoteFolder(noteId));
  const tags = useAppSelector(selectNoteTags(noteId));
  const isDirty = useAppSelector(selectNoteIsDirtyById(noteId));
  const isSaving = useAppSelector(selectNoteIsSavingById(noteId));
  const content = useAppSelector(selectNoteContent(noteId));
  const allFolders = useAppSelector(selectAllFolders);

  const displayLabel = label ?? "";
  const displayFolder = folder ?? "Draft";
  const displayTags = tags ?? [];
  const displayContent = content ?? "";

  // ── Local UI state ─────────────────────────────────────────────────
  const [localLabel, setLocalLabel] = useState(displayLabel);
  const [folderOpen, setFolderOpen] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const folderRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setLocalLabel(displayLabel);
  }, [displayLabel]);

  const wordCount = useMemo(() => {
    const trimmed = displayContent.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [displayContent]);

  const saveStatus = isSaving ? "Saving..." : isDirty ? "Unsaved" : "Saved";
  const statusColor = isSaving
    ? "text-yellow-500"
    : isDirty
      ? "text-amber-500"
      : "text-green-500";

  // ── Handlers ───────────────────────────────────────────────────────
  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalLabel(value);
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
      labelTimerRef.current = setTimeout(() => {
        dispatch(updateNoteLabel({ id: noteId, label: value }));
      }, 800);
    },
    [dispatch, noteId],
  );

  const handleLabelBlur = useCallback(() => {
    if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
    if (localLabel !== displayLabel) {
      dispatch(updateNoteLabel({ id: noteId, label: localLabel }));
    }
  }, [dispatch, noteId, localLabel, displayLabel]);

  const handleFolderChange = useCallback(
    (newFolder: string) => {
      dispatch(updateNoteFolder({ id: noteId, folder: newFolder }));
      setFolderOpen(false);
    },
    [dispatch, noteId],
  );

  const handleRemoveTag = useCallback(
    (tag: string) => {
      dispatch(
        updateNoteTags({
          id: noteId,
          tags: displayTags.filter((t) => t !== tag),
        }),
      );
    },
    [dispatch, noteId, displayTags],
  );

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !displayTags.includes(trimmed)) {
      dispatch(updateNoteTags({ id: noteId, tags: [...displayTags, trimmed] }));
    }
    setTagInput("");
    setAddingTag(false);
  }, [dispatch, noteId, displayTags, tagInput]);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 shrink-0 text-xs">
      {/* Title */}
      <input
        type="text"
        value={localLabel}
        onChange={handleLabelChange}
        onBlur={handleLabelBlur}
        placeholder="Note title..."
        className="flex-1 min-w-0 bg-transparent font-medium text-foreground focus:outline-none placeholder:text-muted-foreground/40"
      />

      {/* Folder dropdown */}
      <div ref={folderRef} className="relative shrink-0">
        <button
          onClick={() => setFolderOpen((v) => !v)}
          className="flex items-center gap-1 px-1.5 py-0.5 text-[0.625rem] text-muted-foreground hover:text-foreground cursor-pointer transition-colors rounded hover:bg-accent/50 [&_svg]:w-3 [&_svg]:h-3"
        >
          <FolderOpen />
          <span className="max-w-[70px] truncate">{displayFolder}</span>
          <ChevronDown className="w-2.5! h-2.5! opacity-50" />
        </button>
        {folderOpen && (
          <div className="absolute right-0 top-full mt-0.5 z-50 min-w-[120px] max-h-[200px] overflow-auto py-1 bg-card/95 backdrop-blur-2xl border border-border rounded-lg shadow-lg">
            {allFolders.map((f) => (
              <button
                key={f}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-[0.625rem] cursor-pointer transition-colors",
                  f === displayFolder
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
      <div className="flex items-center gap-1 shrink-0">
        {displayTags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[0.5625rem] bg-muted rounded-full text-muted-foreground"
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
              if (e.key === "Escape") {
                setAddingTag(false);
                setTagInput("");
              }
            }}
            onBlur={handleAddTag}
            className="w-16 px-1 py-0.5 text-[0.5625rem] bg-muted rounded border border-border outline-none"
            placeholder="tag..."
            style={{ fontSize: "16px" }}
          />
        ) : (
          <button
            onClick={() => setAddingTag(true)}
            className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer [&_svg]:w-2.5 [&_svg]:h-2.5"
          >
            <Plus />
          </button>
        )}
      </div>

      {/* Status */}
      <span className={cn("text-[0.5625rem] shrink-0", statusColor)}>
        {saveStatus}
      </span>
      <span className="text-[0.5625rem] text-muted-foreground/50 shrink-0">
        {wordCount}w
      </span>
    </div>
  );
}
