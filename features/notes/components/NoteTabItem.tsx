// features/notes/components/NoteTabItem.tsx
// Layer 3: Single tab for a note. Zero prop drilling — Redux selectors only.
"use client";

import React, { useRef, useState, useEffect } from "react";
import { X, Save, Copy, Share2, Download, Trash2, XCircle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setInstanceActiveTab, removeInstanceTab } from "../redux/slice";
import { saveNote, copyNote, deleteNote } from "../redux/thunks";
import {
  selectIsInstanceActiveTab,
  selectNoteLabel,
  selectNoteIsDirtyById,
  selectNoteContent,
  selectInstanceTabs,
} from "../redux/selectors";
import { cn } from "@/lib/utils";

interface NoteTabItemProps {
  noteId: string;
  instanceId: string;
}

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
}

const CONTEXT_ACTIONS = [
  { key: "save", label: "Save", icon: Save, category: "actions" },
  { key: "duplicate", label: "Duplicate", icon: Copy, category: "actions" },
  { key: "share", label: "Share", icon: Share2, category: "actions" },
  { key: "export", label: "Export", icon: Download, category: "actions" },
  { key: "close", label: "Close Tab", icon: X, category: "tab" },
  {
    key: "close-others",
    label: "Close Others",
    icon: XCircle,
    category: "tab",
  },
  { key: "close-all", label: "Close All", icon: XCircle, category: "tab" },
  { key: "delete", label: "Delete", icon: Trash2, category: "danger" },
] as const;

export function NoteTabItem({ noteId, instanceId }: NoteTabItemProps) {
  const dispatch = useAppDispatch();

  const isActive = useAppSelector(
    selectIsInstanceActiveTab(instanceId, noteId),
  );
  const label = useAppSelector(selectNoteLabel(noteId));
  const isDirty = useAppSelector(selectNoteIsDirtyById(noteId));
  const content = useAppSelector(selectNoteContent(noteId));
  const openTabs = useAppSelector(selectInstanceTabs(instanceId));

  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!ctxMenu.open) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setCtxMenu((prev) => ({ ...prev, open: false }));
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCtxMenu((prev) => ({ ...prev, open: false }));
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [ctxMenu.open]);

  // ── Handlers ────────────────────────────────────────────────────────

  const handleClick = () => {
    dispatch(setInstanceActiveTab({ instanceId, noteId }));
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeInstanceTab({ instanceId, noteId }));
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ open: true, x: e.clientX, y: e.clientY });
  };

  const handleContextAction = (key: string) => {
    setCtxMenu((prev) => ({ ...prev, open: false }));

    switch (key) {
      case "save":
        dispatch(saveNote(noteId));
        break;
      case "duplicate":
        dispatch(copyNote(noteId));
        break;
      case "share":
        // Emit custom event for share dialog (handled by parent workspace)
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("notes:share", { detail: { noteId } }),
          );
        }
        break;
      case "export": {
        const blob = new Blob([content ?? ""], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${label ?? "Untitled"}.md`;
        a.click();
        URL.revokeObjectURL(url);
        break;
      }
      case "close":
        dispatch(removeInstanceTab({ instanceId, noteId }));
        break;
      case "close-others":
        openTabs?.forEach((id) => {
          if (id !== noteId) {
            dispatch(removeInstanceTab({ instanceId, noteId: id }));
          }
        });
        dispatch(setInstanceActiveTab({ instanceId, noteId }));
        break;
      case "close-all":
        openTabs?.forEach((id) => {
          dispatch(removeInstanceTab({ instanceId, noteId: id }));
        });
        break;
      case "delete":
        dispatch(deleteNote(noteId));
        break;
    }
  };

  // ── DnD ─────────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", noteId);
    e.dataTransfer.effectAllowed = "move";
  };

  const displayLabel =
    (label ?? "Untitled").length > 24
      ? (label ?? "Untitled").slice(0, 22) + "..."
      : (label ?? "Untitled");

  return (
    <>
      <div
        role="tab"
        aria-selected={isActive}
        draggable
        onDragStart={handleDragStart}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={cn(
          "group relative flex items-center gap-1 px-2.5 py-1 rounded-t-md border border-b-0 transition-colors cursor-pointer select-none",
          "min-w-[100px] max-w-[180px] h-[30px] flex-shrink-0",
          isActive
            ? "bg-accent/60 border-border text-foreground"
            : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        )}
      >
        {/* Dirty indicator */}
        {isDirty && (
          <span className="absolute top-1 left-1 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
        )}

        {/* Label */}
        <span className="flex-1 text-xs font-medium truncate pl-1">
          {displayLabel}
        </span>

        {/* Close button */}
        <div
          onClick={handleClose}
          className={cn(
            "flex items-center justify-center h-4 w-4 rounded-sm hover:bg-foreground/10 transition-opacity flex-shrink-0",
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <X className="h-3 w-3" />
        </div>
      </div>

      {/* Context menu */}
      {ctxMenu.open && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[180px] rounded-md border border-border bg-popover shadow-md py-1 text-popover-foreground animate-in fade-in-0 zoom-in-95"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
        >
          {CONTEXT_ACTIONS.map((action, idx) => {
            const Icon = action.icon;
            const prevCategory =
              idx > 0 ? CONTEXT_ACTIONS[idx - 1].category : null;
            const showSeparator =
              prevCategory !== null && prevCategory !== action.category;

            return (
              <React.Fragment key={action.key}>
                {showSeparator && <div className="my-1 h-px bg-border" />}
                <button
                  onClick={() => handleContextAction(action.key)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors",
                    action.category === "danger" &&
                      "text-destructive hover:text-destructive",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  {action.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </>
  );
}
