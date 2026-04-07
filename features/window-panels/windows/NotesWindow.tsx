"use client";

// NotesWindow — Floating notes panel using Redux directly.
// Uses targeted selectors + dispatch(action) instead of hooks with local state.
// Includes split header with title input + folder dropdown.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  Eye,
  FolderOpen,
  Pencil,
  Plus,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/ButtonMine";
import {
  WindowPanel,
  type WindowPanelProps,
} from "@/features/window-panels/WindowPanel";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAllNotesList,
  selectActiveNote,
  selectActiveNoteId,
  selectAllFolders,
  selectNoteIsDirty,
} from "@/features/notes/redux/selectors";
import {
  setActiveNote,
  updateNoteContent,
  updateNoteLabel,
  updateNoteFolder,
} from "@/features/notes/redux/slice";
import {
  fetchNotesList,
  fetchNoteContent,
  saveNote,
  createNewNote,
} from "@/features/notes/redux/thunks";
import { NotesTreeView } from "@/features/notes/actions/NotesTreeView";
import { NoteEditorWithChrome } from "@/features/notes/components/NoteEditorWithChrome";
import type { Note } from "@/features/notes/types";

const activeNoteMemo = new Map<string, string>();

export interface NotesWindowProps
  extends Omit<
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
    <NotesWindowShell title={title} instanceId={id} id={id} {...windowProps} />
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
  const dispatch = useAppDispatch();

  // ── Redux selectors (targeted, no intermediate hooks) ──────────────
  const notes = useAppSelector(selectAllNotesList);
  const activeNoteRecord = useAppSelector(selectActiveNote);
  const activeNoteId = useAppSelector(selectActiveNoteId);
  const allFolders = useAppSelector(selectAllFolders);
  const isDirty = useAppSelector((s) =>
    activeNoteId ? selectNoteIsDirty(activeNoteId)(s) : false,
  );

  // ── Local UI state only ────────────────────────────────────────────
  const [previewMode, setPreviewMode] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initRef = useRef(false);
  const folderDropdownRef = useRef<HTMLDivElement>(null);

  // ── Derived from Redux (no local mirror) ───────────────────────────
  const noteLabel = activeNoteRecord?.label ?? "";
  const noteContent = activeNoteRecord?.content ?? "";
  const noteFolder = activeNoteRecord?.folder_name ?? "Draft";
  const isSaving = activeNoteRecord?._saving ?? false;

  // ── Init: fetch notes list once ────────────────────────────────────
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      dispatch(fetchNotesList());
    }
  }, [dispatch]);

  // ── Restore remembered note ────────────────────────────────────────
  useEffect(() => {
    if (activeNoteId) return; // already have one
    if (notes.length === 0) return;

    const rememberedId = activeNoteMemo.get(instanceId);
    if (rememberedId && notes.find((n) => n.id === rememberedId)) {
      dispatch(setActiveNote(rememberedId));
      dispatch(fetchNoteContent(rememberedId));
      return;
    }

    // Select first note
    dispatch(setActiveNote(notes[0].id));
    dispatch(fetchNoteContent(notes[0].id));
  }, [notes.length, activeNoteId, dispatch, instanceId]);

  // ── Remember active note per instance ──────────────────────────────
  useEffect(() => {
    if (activeNoteId) activeNoteMemo.set(instanceId, activeNoteId);
  }, [activeNoteId, instanceId]);

  // ── Close folder dropdown on outside click ─────────────────────────
  useEffect(() => {
    if (!folderOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        folderDropdownRef.current &&
        !folderDropdownRef.current.contains(e.target as Node)
      ) {
        setFolderOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [folderOpen]);

  // ── Debounced save timer ───────────────────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = useCallback(() => {
    if (!activeNoteId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      dispatch(saveNote(activeNoteId));
    }, 2000);
  }, [activeNoteId, dispatch]);

  // ── Handlers using Redux dispatch directly ─────────────────────────

  const handleContentChange = useCallback(
    (val: string) => {
      if (!activeNoteId) return;
      dispatch(updateNoteContent({ id: activeNoteId, content: val }));
      scheduleSave();
    },
    [activeNoteId, dispatch, scheduleSave],
  );

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!activeNoteId) return;
      dispatch(updateNoteLabel({ id: activeNoteId, label: e.target.value }));
      scheduleSave();
    },
    [activeNoteId, dispatch, scheduleSave],
  );

  const handleFolderChange = useCallback(
    (folder: string) => {
      if (!activeNoteId) return;
      dispatch(updateNoteFolder({ id: activeNoteId, folder }));
      dispatch(saveNote(activeNoteId));
      setFolderOpen(false);
    },
    [activeNoteId, dispatch],
  );

  const handleSelectNote = useCallback(
    (note: Note) => {
      if (note.id === activeNoteId) return;
      if (activeNoteId && isDirty) dispatch(saveNote(activeNoteId));
      dispatch(setActiveNote(note.id));
      dispatch(fetchNoteContent(note.id));
      setTimeout(() => textareaRef.current?.focus(), 50);
    },
    [activeNoteId, isDirty, dispatch],
  );

  const handleNew = useCallback(async () => {
    if (activeNoteId && isDirty) dispatch(saveNote(activeNoteId));
    dispatch(createNewNote({ folder_name: noteFolder }));
  }, [activeNoteId, isDirty, noteFolder, dispatch]);

  const handleForceSave = useCallback(() => {
    if (!activeNoteId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    dispatch(saveNote(activeNoteId));
  }, [activeNoteId, dispatch]);

  // ── Header actions ─────────────────────────────────────────────────

  const iconBtn = "h-5 w-5 p-0";

  const leftActions = (
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
        onClick={handleForceSave}
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
        onClick={() => window.open("/ssr/notes", "_blank")}
        title="Open full notes app"
        className={iconBtn}
      >
        <ExternalLink className="h-3 w-3" />
      </Button>
    </div>
  );

  // ── Sidebar ────────────────────────────────────────────────────────

  const sidebarContent = (
    <NotesTreeView
      onSelectNote={handleSelectNote}
      activeNoteId={activeNoteId}
      className="flex-1 overflow-auto"
    />
  );

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <WindowPanel
      title={title}
      minWidth={340}
      minHeight={220}
      actionsLeft={leftActions}
      actionsRight={rightActions}
      sidebar={sidebarContent}
      sidebarDefaultSize={25}
      sidebarMinSize={10}
      sidebarClassName="bg-muted/20"
      urlSyncKey="notes"
      urlSyncId="default"
      {...windowProps}
    >
      <div
        className="h-full flex flex-col min-w-0 min-h-0"
        style={{ overflow: "hidden" }}
      >
        {/* ── Split header: Title + Folder Selector ──────────────── */}
        <div className="shrink-0 flex items-center gap-1 border-b border-border/30">
          <input
            type="text"
            value={noteLabel}
            onChange={handleLabelChange}
            onBlur={() => {
              if (activeNoteId && isDirty) scheduleSave();
            }}
            placeholder="Note title..."
            className="flex-1 min-w-0 px-3 py-1 text-[11px] font-medium bg-transparent focus:outline-none focus:border-primary/40 text-foreground placeholder:text-muted-foreground/40"
          />

          {/* Folder dropdown */}
          <div ref={folderDropdownRef} className="relative shrink-0">
            <button
              onClick={() => setFolderOpen((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors [&_svg]:w-3 [&_svg]:h-3"
              title="Change folder"
            >
              <FolderOpen />
              <span className="max-w-[60px] truncate">{noteFolder}</span>
              <ChevronDown className="w-2.5! h-2.5! opacity-50" />
            </button>

            {folderOpen && (
              <div className="absolute right-0 top-full mt-0.5 z-50 min-w-[120px] max-h-[200px] overflow-auto py-1 bg-card/95 backdrop-blur-2xl border border-border rounded-lg shadow-lg">
                {allFolders.map((f) => (
                  <button
                    key={f}
                    className={`w-full text-left px-3 py-1.5 text-[10px] cursor-pointer transition-colors ${
                      f === noteFolder
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-accent"
                    }`}
                    onClick={() => handleFolderChange(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Editor ──────────────────────────────────────────────── */}
        <NoteEditorWithChrome
          noteId={activeNoteId ?? ""}
          content={noteContent}
          onChange={handleContentChange}
          editorMode={previewMode ? "preview" : "plain"}
          textareaRef={textareaRef}
          isDirty={isDirty}
          saveState={isSaving ? "saving" : isDirty ? "dirty" : "saved"}
          lastUpdatedAt={activeNoteRecord?.updated_at}
          allFolders={allFolders}
          currentFolder={noteFolder}
          onSave={handleForceSave}
          showVoiceButton={!previewMode}
          placeholder="Start typing..."
          className="flex-1 min-h-0"
          textareaClassName="px-3 py-2 text-sm"
        />
      </div>
    </WindowPanel>
  );
}
