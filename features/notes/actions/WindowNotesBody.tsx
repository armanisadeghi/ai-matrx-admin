"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/ButtonMine";
import { cn } from "@/lib/utils";
import { NotesProvider, useNotesContext } from "../context/NotesContext";
import { useAutoSave } from "../hooks/useAutoSave";
import { useAutoLabel } from "../hooks/useAutoLabel";
import { NotesTreeView } from "./NotesTreeView";
import { NoteEditorWithChrome } from "../components/NoteEditorWithChrome";
import type { Note } from "../types";

function WindowNotesInner({ className }: { className?: string }) {
  const {
    isLoading,
    activeNote,
    setActiveNote,
    refreshNotes,
    findOrCreateEmptyNote,
    setActiveNoteDirty,
  } = useNotesContext();

  const [localContent, setLocalContent] = useState("");
  const [localLabel, setLocalLabel] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const init = async () => {
      await refreshNotes();
      try {
        await findOrCreateEmptyNote("Draft");
      } catch {
        // ignored
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeNote) {
      setLocalContent(activeNote.content ?? "");
      setLocalLabel(activeNote.label ?? "");
    }
  }, [activeNote?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { isDirty, isSaving, lastSaved, updateWithAutoSave, forceSave } =
    useAutoSave({
      noteId: activeNote?.id ?? null,
      debounceMs: 2000,
    });

  useEffect(() => {
    setActiveNoteDirty(isDirty);
  }, [isDirty, setActiveNoteDirty]);

  useAutoLabel({
    content: localContent,
    currentLabel: localLabel,
    onLabelChange: (newLabel) => {
      setLocalLabel(newLabel);
      updateWithAutoSave({ label: newLabel });
    },
  });

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setLocalContent(value);
      updateWithAutoSave({ content: value });
    },
    [updateWithAutoSave],
  );

  const handleLabelBlur = useCallback(() => {
    if (activeNote && localLabel !== activeNote.label) {
      updateWithAutoSave({ label: localLabel });
    }
  }, [activeNote, localLabel, updateWithAutoSave]);

  const handleSelectNote = useCallback(
    (note: Note) => {
      forceSave();
      setActiveNote(note);
      setPickerOpen(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    },
    [forceSave, setActiveNote],
  );

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* ── Compact toolbar ──────────────────────────────────── */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border/50 bg-muted/30 shrink-0">
        <div className="relative flex-1 min-w-0" ref={pickerRef}>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1 w-full text-left px-1.5 py-0.5 rounded text-xs",
              "hover:bg-accent/50 transition-colors truncate",
              pickerOpen && "bg-accent/50",
            )}
            onClick={() => setPickerOpen((v) => !v)}
          >
            <span className="text-muted-foreground truncate text-[10px]">
              {activeNote?.folder_name ?? "Draft"}/
            </span>
            <span className="font-medium truncate">
              {localLabel || "New Note"}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 ml-auto" />
          </button>

          {pickerOpen && (
            <div className="absolute left-0 top-full mt-0.5 z-50 w-64 max-h-72 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
              <NotesTreeView
                onSelectNote={handleSelectNote}
                activeNoteId={activeNote?.id}
                className="overflow-auto max-h-72"
              />
            </div>
          )}
        </div>

        <span className="text-[9px] text-muted-foreground/60 shrink-0 tabular-nums">
          {isSaving
            ? "saving..."
            : isDirty
              ? "unsaved"
              : lastSaved
                ? "saved"
                : ""}
        </span>
      </div>

      {/* ── Editable label ───────────────────────────────────── */}
      <input
        type="text"
        value={localLabel}
        onChange={(e) => setLocalLabel(e.target.value)}
        onBlur={handleLabelBlur}
        placeholder="Note title..."
        className="shrink-0 px-3 py-1 text-xs font-medium bg-transparent border-b border-border/30 focus:outline-none focus:border-primary/40 text-foreground placeholder:text-muted-foreground/40"
        style={{ fontSize: "16px" }}
      />

      {/* ── Content editor with context menu + status bar ──── */}
      <NoteEditorWithChrome
        noteId={activeNote?.id ?? ""}
        content={localContent}
        onChange={(val) => {
          setLocalContent(val);
          updateWithAutoSave({ content: val });
        }}
        editorMode="plain"
        textareaRef={textareaRef}
        isDirty={isDirty}
        saveState={isSaving ? "saving" : isDirty ? "dirty" : "saved"}
        lastUpdatedAt={activeNote?.updated_at ?? undefined}
        onSave={() => forceSave()}
        placeholder="Start typing..."
        className="flex-1 min-h-0"
        textareaClassName="px-3 py-2 text-sm"
        showVoiceButton={false}
      />
    </div>
  );
}

export interface WindowNotesBodyProps {
  className?: string;
}

export function WindowNotesBody({ className }: WindowNotesBodyProps) {
  return (
    <NotesProvider>
      <WindowNotesInner className={className} />
    </NotesProvider>
  );
}
