"use client";

import { useState } from "react";
import {
  NotebookPen,
  Copy,
  Download,
  FolderInput,
  ChevronRight,
  Trash2,
  Plus,
  Pencil,
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Note context menu ────────────────────────────────────────────────────────

interface NoteContextMenuProps {
  x: number;
  y: number;
  noteId: string;
  noteFolder: string | undefined;
  orderedFolders: string[];
  onOpen: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onMove: (folder: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function SidebarNoteContextMenu({
  x,
  y,
  noteFolder,
  orderedFolders,
  onOpen,
  onDuplicate,
  onExport,
  onMove,
  onDelete,
  onClose,
}: NoteContextMenuProps) {
  const [showFolderSubmenu, setShowFolderSubmenu] = useState(false);

  const itemClass =
    "flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-foreground rounded-md cursor-pointer transition-colors hover:bg-accent [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground";

  return (
    <div
      className="fixed z-100 min-w-[200px] p-1 bg-card/95 backdrop-blur-2xl saturate-150 border border-border rounded-lg shadow-lg"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      <button className={itemClass} onClick={() => { onOpen(); onClose(); }}>
        <NotebookPen /> Open Note
      </button>
      <button className={itemClass} onClick={() => { onDuplicate(); onClose(); }}>
        <Copy /> Duplicate
      </button>
      <button className={itemClass} onClick={() => { onExport(); onClose(); }}>
        <Download /> Export
      </button>

      <div className="h-px my-1 mx-1.5 bg-border" />
      <button
        className="flex items-center justify-between gap-2 w-full px-2.5 py-1.5 text-xs text-foreground rounded-md cursor-pointer transition-colors hover:bg-accent [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground"
        onClick={(e) => { e.stopPropagation(); setShowFolderSubmenu((v) => !v); }}
      >
        <span className="flex items-center gap-2"><FolderInput /> Move to folder</span>
        <ChevronRight className={cn("w-3! h-3! transition-transform", showFolderSubmenu && "rotate-90")} />
      </button>
      {showFolderSubmenu && (
        <div className="ml-3 max-h-[200px] overflow-y-auto notes-scrollable">
          {orderedFolders.map((folder) => {
            const isCurrent = noteFolder === folder;
            return (
              <button
                key={folder}
                className={cn(
                  "flex items-center gap-2 w-full px-2.5 py-1 text-xs rounded-md cursor-pointer transition-colors [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground",
                  isCurrent
                    ? "text-amber-600 dark:text-amber-400 bg-amber-500/5"
                    : "text-foreground hover:bg-accent",
                )}
                onClick={() => { onMove(folder); onClose(); }}
                disabled={isCurrent}
              >
                <FolderInput />
                {folder}
                {isCurrent && <span className="ml-auto text-[0.625rem] opacity-50">current</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="h-px my-1 mx-1.5 bg-border" />
      <button
        className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-destructive rounded-md cursor-pointer transition-colors hover:bg-destructive/10 [&_svg]:w-3.5 [&_svg]:h-3.5"
        onClick={() => { onDelete(); onClose(); }}
      >
        <Trash2 /> Delete Note
      </button>
    </div>
  );
}

// ─── Folder context menu ──────────────────────────────────────────────────────

interface FolderContextMenuProps {
  x: number;
  y: number;
  folder: string;
  isDefaultFolder: boolean;
  isExpanded: boolean;
  onNewNote: () => void;
  onRename: () => void;
  onToggle: () => void;
  onDeleteAll: () => void;
  onClose: () => void;
}

export function SidebarFolderContextMenu({
  x,
  y,
  folder,
  isDefaultFolder,
  isExpanded,
  onNewNote,
  onRename,
  onToggle,
  onDeleteAll,
  onClose,
}: FolderContextMenuProps) {
  const itemClass =
    "flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-foreground rounded-md cursor-pointer transition-colors hover:bg-accent [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground";

  return (
    <div
      className="fixed z-100 min-w-[200px] p-1 bg-card/95 backdrop-blur-2xl saturate-150 border border-border rounded-lg shadow-lg"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      <button className={itemClass} onClick={() => { onNewNote(); onClose(); }}>
        <Plus /> New Note in {folder}
      </button>
      {!isDefaultFolder && (
        <button className={itemClass} onClick={() => { onRename(); onClose(); }}>
          <Pencil /> Rename Folder
        </button>
      )}
      <button className={itemClass} onClick={() => { onToggle(); onClose(); }}>
        {isExpanded ? <ChevronsDownUp /> : <ChevronsUpDown />}
        {isExpanded ? "Collapse" : "Expand"}
      </button>
      <div className="h-px my-1 mx-1.5 bg-border" />
      <button
        className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-destructive rounded-md cursor-pointer transition-colors hover:bg-destructive/10 [&_svg]:w-3.5 [&_svg]:h-3.5"
        onClick={() => { onDeleteAll(); onClose(); }}
      >
        <Trash2 /> Delete All Notes
      </button>
    </div>
  );
}

// ─── Rename folder dialog ─────────────────────────────────────────────────────

interface RenameFolderDialogProps {
  folder: string;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RenameFolderDialog({
  folder,
  value,
  onChange,
  onConfirm,
  onCancel,
}: RenameFolderDialogProps) {
  return (
    <div
      className="fixed inset-0 z-110 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="p-4 bg-card/95 backdrop-blur-2xl saturate-150 border border-border rounded-xl shadow-xl min-w-[280px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium mb-2">
          Rename &ldquo;{folder}&rdquo;
        </h3>
        <input
          className="w-full h-8 px-3 text-sm bg-muted rounded-lg border border-border outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirm();
            if (e.key === "Escape") onCancel();
          }}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            className="px-3 py-1 text-xs rounded-md border border-border text-muted-foreground cursor-pointer hover:bg-accent"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90"
            onClick={onConfirm}
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}
