"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ExternalLink,
  Eye,
  PanelLeftClose,
  PanelLeft,
  Pencil,
  Plus,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/ButtonMine";
import {
  WindowPanel,
  type WindowPanelProps,
} from "@/components/official-candidate/floating-window-panel/WindowPanel";
import { NotesProvider, useNotesContext } from "../context/NotesContext";
import { useAutoSave } from "../hooks/useAutoSave";
import { useAutoLabel } from "../hooks/useAutoLabel";
import { NotesTreeView } from "./NotesTreeView";
import type { Note } from "../types";

const MarkdownStream = dynamic(() => import("@/components/MarkdownStream"), {
  ssr: false,
  loading: () => (
    <div className="p-3 text-xs text-muted-foreground">Loading preview...</div>
  ),
});

const activeNoteMemo = new Map<string, string>();

export interface NotesWindowProps extends Omit<
  WindowPanelProps,
  "children" | "title" | "actionsLeft" | "actionsRight"
> {
  title?: string;
}

export function NotesWindow({
  title = "Notes",
  id = "notes-window",
  ...windowProps
}: NotesWindowProps) {
  return (
    <NotesProvider>
      <NotesWindowShell
        title={title}
        instanceId={id}
        id={id}
        {...windowProps}
      />
    </NotesProvider>
  );
}

function NotesWindowShell({
  title,
  instanceId,
  ...windowProps
}: { title: string; instanceId: string } & Omit<
  WindowPanelProps,
  "children" | "title" | "actionsLeft" | "actionsRight"
>) {
  const {
    notes,
    activeNote,
    setActiveNote,
    refreshNotes,
    findOrCreateEmptyNote,
    setActiveNoteDirty,
  } = useNotesContext();

  const [localContent, setLocalContent] = useState("");
  const [localLabel, setLocalLabel] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSavedLabelRef = useRef("");
  const initRan = useRef(false);
  const noteRestoredRef = useRef(false);

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    refreshNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (noteRestoredRef.current) return;
    if (activeNote) {
      noteRestoredRef.current = true;
      return;
    }
    if (notes.length === 0) return;

    const rememberedId = activeNoteMemo.get(instanceId);
    if (rememberedId) {
      const found = notes.find((n) => n.id === rememberedId);
      if (found) {
        noteRestoredRef.current = true;
        setActiveNote(found);
        return;
      }
    }

    noteRestoredRef.current = true;
    findOrCreateEmptyNote("Draft").catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.length]);

  useEffect(() => {
    if (activeNote?.id) {
      activeNoteMemo.set(instanceId, activeNote.id);
    }
  }, [activeNote?.id, instanceId]);

  useEffect(() => {
    if (activeNote) {
      setLocalContent(activeNote.content ?? "");
      setLocalLabel(activeNote.label ?? "");
      lastSavedLabelRef.current = activeNote.label ?? "";
    }
  }, [activeNote?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveSuccess = useCallback(() => {
    if (localLabel !== lastSavedLabelRef.current) {
      lastSavedLabelRef.current = localLabel;
      refreshNotes();
    }
  }, [localLabel, refreshNotes]);

  const { isDirty, isSaving, updateWithAutoSave, forceSave } = useAutoSave({
    noteId: activeNote?.id ?? null,
    debounceMs: 2000,
    onSaveSuccess: handleSaveSuccess,
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
      if (note.id === activeNote?.id) return;
      forceSave();
      setActiveNote(note);
      setTimeout(() => textareaRef.current?.focus(), 50);
    },
    [activeNote, forceSave, setActiveNote],
  );

  const handleNew = useCallback(async () => {
    forceSave();
    try {
      await findOrCreateEmptyNote(activeNote?.folder_name ?? "Draft");
    } catch {
      // ignored
    }
  }, [activeNote, findOrCreateEmptyNote, forceSave]);

  // ── Header action nodes ──────────────────────────────────────

  const iconBtn = "h-5 w-5 p-0";

  const leftActions = (
    <>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => setSidebarOpen((v) => !v)}
        title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        className={iconBtn}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="h-3 w-3" />
        ) : (
          <PanelLeft className="h-3 w-3" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => setPreviewMode((v) => !v)}
        title={previewMode ? "Edit mode" : "Preview mode"}
        className={iconBtn}
      >
        {previewMode ? (
          <Pencil className="h-3 w-3" />
        ) : (
          <Eye className="h-3 w-3" />
        )}
      </Button>
    </>
  );

  const rightActions = (
    <div className="flex items-center gap-0.5">
      {(isDirty || isSaving) && (
        <span className="text-[9px] text-muted-foreground/50 tabular-nums mr-0.5">
          {isSaving ? "saving..." : "unsaved"}
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={handleNew}
        title="New note"
        className={iconBtn}
      >
        <Plus className="h-3 w-3" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => forceSave()}
        title="Save now"
        className={iconBtn}
        disabled={!isDirty}
      >
        <Save className="h-3 w-3" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => window.open("/notes", "_blank")}
        title="Open full notes app"
        className={iconBtn}
      >
        <ExternalLink className="h-3 w-3" />
      </Button>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────

  return (
    <WindowPanel
      title={title}
      minWidth={340}
      minHeight={220}
      actionsLeft={leftActions}
      actionsRight={rightActions}
      {...windowProps}
    >
      <div className="flex h-full min-h-0 bg-background">
        {sidebarOpen && (
          <div className="w-44 shrink-0 border-r border-border/40 bg-muted/20 flex flex-col min-h-0 overflow-hidden">
            <NotesTreeView
              onSelectNote={handleSelectNote}
              activeNoteId={activeNote?.id}
              className="flex-1 overflow-auto"
            />
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <input
            type="text"
            value={localLabel}
            onChange={(e) => setLocalLabel(e.target.value)}
            onBlur={handleLabelBlur}
            placeholder="Note title..."
            className="shrink-0 px-3 py-1 text-[11px] font-medium bg-transparent border-b border-border/30 focus:outline-none focus:border-primary/40 text-foreground placeholder:text-muted-foreground/40"
          />

          {previewMode ? (
            <div className="flex-1 overflow-auto px-3 py-2 min-h-0">
              {localContent.trim() ? (
                <MarkdownStream content={localContent} />
              ) : (
                <p className="text-xs text-muted-foreground/50 italic pt-1">
                  No content to preview
                </p>
              )}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={handleContentChange}
              placeholder="Start typing..."
              className="flex-1 w-full resize-none bg-transparent px-3 py-2 text-sm text-foreground/90 focus:outline-none placeholder:text-muted-foreground/40 min-h-0"
              style={{ fontSize: "16px" }}
            />
          )}
        </div>
      </div>
    </WindowPanel>
  );
}
