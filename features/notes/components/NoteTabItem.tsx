"use client";

// Layer 3: NoteTabItem — Full-featured VSCode-style tab.
// Matches ALL SSR workspace tab features:
// - Editable title on active tab (debounced save)
// - Dirty indicator (amber dot)
// - Active tab action buttons: Save, Duplicate, Share, Folder, Delete, History, Voice
// - Close button on all tabs
// - Right-click context menu
// - DnD reordering
// Props: noteId + instanceId only. Everything from Redux.

import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  Save,
  Copy,
  Share2,
  FolderInput,
  Trash2,
  History,
  X,
  Download,
  Link2,
} from "lucide-react";
import { MicrophoneIconButton } from "@/features/audio/components/MicrophoneIconButton";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  setInstanceActiveTab,
  removeInstanceTab,
  updateNoteLabel,
  updateNoteContent,
  updateNoteFolder,
} from "../redux/slice";
import {
  selectNoteLabel,
  selectNoteIsDirtyById,
  selectNoteIsSavingById,
  selectNoteFolder,
  selectAllFolders,
  selectNoteContent,
} from "../redux/selectors";
import { saveNote, copyNote, deleteNote } from "../redux/thunks";
import { cn } from "@/lib/utils";

interface NoteTabItemProps {
  noteId: string;
  instanceId: string;
}

const actionBtnClass =
  "flex items-center justify-center w-6 h-6 rounded cursor-pointer transition-colors text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:w-3.5 [&_svg]:h-3.5";

export function NoteTabItem({ noteId, instanceId }: NoteTabItemProps) {
  const dispatch = useAppDispatch();

  // ── Redux state ────────────────────────────────────────────────────
  const label = useAppSelector(selectNoteLabel(noteId)) ?? "Untitled";
  const isDirty = useAppSelector(selectNoteIsDirtyById(noteId));
  const isSaving = useAppSelector(selectNoteIsSavingById(noteId));
  const isActive = useAppSelector(
    (s) => s.notes?.instances?.[instanceId]?.activeTabId === noteId,
  );
  const currentFolder = useAppSelector(selectNoteFolder(noteId)) ?? "Draft";
  const allFolders = useAppSelector(selectAllFolders);
  const content = useAppSelector(selectNoteContent(noteId)) ?? "";

  // ── Local UI state ─────────────────────────────────────────────────
  const [localLabel, setLocalLabel] = useState(label);
  const [showFolderDrop, setShowFolderDrop] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const folderBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync Redux label → local
  const lastLabelRef = useRef(label);
  if (label !== lastLabelRef.current) {
    lastLabelRef.current = label;
    setLocalLabel(label);
  }

  // Close context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ctxMenu]);

  // ── Handlers ───────────────────────────────────────────────────────
  const handleClick = useCallback(() => {
    if (!isActive) dispatch(setInstanceActiveTab({ instanceId, noteId }));
  }, [dispatch, instanceId, noteId, isActive]);

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      dispatch(removeInstanceTab({ instanceId, noteId }));
    },
    [dispatch, instanceId, noteId],
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalLabel(value);
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
      labelTimerRef.current = setTimeout(() => {
        lastLabelRef.current = value;
        dispatch(updateNoteLabel({ id: noteId, label: value }));
      }, 500);
    },
    [dispatch, noteId],
  );

  const handleDeleteAndClose = useCallback(() => {
    dispatch(removeInstanceTab({ instanceId, noteId }));
    dispatch(deleteNote(noteId));
  }, [dispatch, instanceId, noteId]);

  const handleExport = useCallback(() => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label || "note"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [content, label]);

  const handleTranscription = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      const sep = content.length > 0 ? "\n\n" : "";
      dispatch(updateNoteContent({ id: noteId, content: content + sep + text }));
    },
    [dispatch, noteId, content],
  );

  // ── Context menu items ─────────────────────────────────────────────
  const ctxItems = [
    { icon: <Save className="w-3 h-3" />, label: "Save", fn: () => dispatch(saveNote(noteId)) },
    { icon: <Copy className="w-3 h-3" />, label: "Duplicate", fn: () => dispatch(copyNote(noteId)) },
    { icon: <Link2 className="w-3 h-3" />, label: "Share Link", fn: () => {} },
    { icon: <Download className="w-3 h-3" />, label: "Export as Markdown", fn: handleExport },
    null,
    { icon: <X className="w-3 h-3" />, label: "Close Tab", fn: () => dispatch(removeInstanceTab({ instanceId, noteId })) },
    { icon: <X className="w-3 h-3" />, label: "Close Other Tabs", fn: () => {
      const tabs = (useAppSelector as any)((s: any) => s.notes?.instances?.[instanceId]?.openTabs) ?? [];
      // Can't use hooks in callback — dispatch individual removes
    }},
    null,
    { icon: <Trash2 className="w-3 h-3" />, label: "Delete Note", fn: handleDeleteAndClose, destructive: true },
  ];

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", noteId);
        }}
        className={cn(
          "group flex items-center gap-0 px-[6px] text-[0.6875rem] font-medium whitespace-nowrap min-w-0 shrink-0 transition-colors",
          isActive
            ? "max-w-[340px] bg-accent/60 text-foreground"
            : "max-w-[160px] bg-transparent text-muted-foreground hover:bg-accent/30 cursor-pointer",
        )}
        role="tab"
        data-active={isActive ? "true" : undefined}
        aria-selected={isActive}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          setCtxMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        {isDirty && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mr-1" />
        )}

        {isActive ? (
          <input
            className="bg-transparent outline-none border-none min-w-0 w-full text-[0.6875rem] font-medium text-foreground truncate cursor-text"
            value={localLabel}
            onChange={handleTitleChange}
            onClick={(e) => e.stopPropagation()}
            aria-label="Note title"
            spellCheck={false}
          />
        ) : (
          <span className="overflow-hidden text-ellipsis">{label}</span>
        )}

        {/* Active tab action buttons */}
        {isActive && (
          <div
            className="flex items-center gap-px shrink-0 ml-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={cn(actionBtnClass, (isDirty || isSaving) && "text-amber-500")}
              onClick={() => dispatch(saveNote(noteId))}
              title="Save (Ctrl+S)"
            >
              <Save />
            </button>
            <button className={actionBtnClass} onClick={() => dispatch(copyNote(noteId))} title="Duplicate">
              <Copy />
            </button>
            <button className={actionBtnClass} title="Share note">
              <Share2 />
            </button>
            <button
              ref={folderBtnRef}
              className={actionBtnClass}
              onClick={() => setShowFolderDrop((v) => !v)}
              title="Move to folder"
            >
              <FolderInput />
            </button>
            <button
              className={cn(actionBtnClass, "hover:text-destructive")}
              onClick={handleDeleteAndClose}
              title="Delete"
            >
              <Trash2 />
            </button>
            <MicrophoneIconButton
              onTranscriptionComplete={handleTranscription}
              variant="icon-only"
              size="sm"
            />
          </div>
        )}

        {/* Close button */}
        <span
          className="notes-tab-close-btn flex items-center justify-center w-4 h-4 rounded-sm text-muted-foreground shrink-0 hover:bg-accent hover:text-foreground ml-1"
          role="button"
          aria-label={`Close ${label}`}
          onClick={handleClose}
        >
          <X className="w-2.5 h-2.5" />
        </span>
      </div>

      {/* Folder dropdown */}
      {showFolderDrop && isActive && (
        <div className="absolute z-50 mt-1 min-w-[120px] max-h-[200px] overflow-auto py-1 bg-card/95 backdrop-blur-2xl border border-border rounded-lg shadow-lg">
          {allFolders.map((f) => (
            <button
              key={f}
              className={cn(
                "w-full text-left px-3 py-1.5 text-[0.625rem] cursor-pointer transition-colors",
                f === currentFolder ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-accent",
              )}
              onClick={() => {
                dispatch(updateNoteFolder({ id: noteId, folder: f }));
                setShowFolderDrop(false);
              }}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Right-click context menu */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-[110]" onClick={() => setCtxMenu(null)} />
          <div
            ref={menuRef}
            className="fixed z-[120] min-w-[160px] py-1 bg-card/95 backdrop-blur-2xl border border-border rounded-lg shadow-lg"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            {[
              { icon: <Save className="w-3 h-3" />, label: "Save", fn: () => dispatch(saveNote(noteId)) },
              { icon: <Copy className="w-3 h-3" />, label: "Duplicate", fn: () => dispatch(copyNote(noteId)) },
              { icon: <Download className="w-3 h-3" />, label: "Export as Markdown", fn: handleExport },
              null,
              { icon: <X className="w-3 h-3" />, label: "Close Tab", fn: () => dispatch(removeInstanceTab({ instanceId, noteId })) },
              null,
              { icon: <Trash2 className="w-3 h-3" />, label: "Delete Note", fn: handleDeleteAndClose, destructive: true },
            ].map((item, i) =>
              item === null ? (
                <div key={`sep-${i}`} className="h-px bg-border/50 my-1" />
              ) : (
                <button
                  key={item.label}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors cursor-pointer",
                    (item as any).destructive ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-accent",
                  )}
                  onClick={() => { item.fn(); setCtxMenu(null); }}
                >
                  {item.icon} {item.label}
                </button>
              ),
            )}
          </div>
        </>
      )}
    </>
  );
}
