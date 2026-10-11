"use client";

import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { UntrustedCount } from "@ai-matrx/design-system";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  ChevronRight,
  FileText,
  House,
  Plus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { noteCreateErrorMessage } from "../utils/writeErrors";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { useNotesRedux } from "../hooks/useNotesRedux";
import { useNoteHomes } from "../homes/useNoteHomes";
import { NotesAPI } from "../service/notesApi";
import type { Note } from "../types";

export interface NotesTreeViewProps {
  onSelectNote?: (note: Note) => void;
  onSelectHome?: (scopeId: string) => void;
  activeNoteId?: string | null;
  className?: string;
}

export function NotesTreeView({
  onSelectNote,
  onSelectHome,
  activeNoteId,
  className,
}: NotesTreeViewProps) {
  const { notes, isLoading, error: notesError } = useNotesRedux();
  // ORG-GATE-AUDIT: the new-note resolver (waits for boot, then ASKS), never
  // the bare kernel on the active selection — creating a note or folder with
  // no organization selected opens the picker and continues this same create.
  const noteHomes = useNoteHomes();
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [creatingNoteIn, setCreatingNoteIn] = useState<string | null>(null);
  const [newNoteLabel, setNewNoteLabel] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const noteInputRef = useRef<HTMLInputElement>(null);

  const notesByFolder = useMemo(() => {
    const grouped: Record<string, Note[]> = {};
    for (const note of notes) {
      (grouped[note.home_scope_id ?? ""] ??= []).push(note);
    }
    for (const folder of Object.keys(grouped)) {
      grouped[folder].sort((a, b) => {
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        return bTime - aTime;
      });
    }
    return grouped;
  }, [notes]);

  // Only homes that hold a note; a home is a scope, not something made here.
  const allFolders = useMemo(
    () =>
      Object.keys(notesByFolder).sort((a, b) =>
        (noteHomes.labelOf(a) ?? "").localeCompare(noteHomes.labelOf(b) ?? ""),
      ),
    [notesByFolder, noteHomes],
  );

  // Auto-expand the folder containing the active note
  useEffect(() => {
    if (!activeNoteId) return;
    const note = notes.find((n) => n.id === activeNoteId);
    if (note?.home_scope_id && note.home_scope_id !== expandedFolder) {
      setExpandedFolder(note.home_scope_id);
    }
  }, [activeNoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleFolder = useCallback(
    (folder: string) => {
      const next = expandedFolder === folder ? null : folder;
      setExpandedFolder(next);
      if (next) onSelectHome?.(next);
      setCreatingNoteIn(null);
    },
    [expandedFolder, onSelectHome],
  );

  const handleNoteClick = useCallback(
    (note: Note) => {
      onSelectNote?.(note);
    },
    [onSelectNote],
  );

  // Inline note creation
  const handleStartCreateNote = useCallback(
    (folder: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setCreatingNoteIn(folder);
      setNewNoteLabel("");
      setTimeout(() => noteInputRef.current?.focus(), 30);
    },
    [],
  );

  const handleConfirmCreateNote = useCallback(
    async (folder: string) => {
      const label = newNoteLabel.trim();
      if (!label) {
        setCreatingNoteIn(null);
        return;
      }
      setBusyAction(`note-${folder}`);
      try {
        const capturedOrganizationId = await ensureOrgId(noteHomes.byId.get(folder)?.organizationId ?? null);
        const note = await NotesAPI.create({
          label,
          content: "",
          home_scope_id: folder,
          organization_id: capturedOrganizationId,
        });
        onSelectNote?.(note);
      } catch (cause) {
        // Cancelling the picker is "nothing happened" — no toast.
        // A create that closes its input row and says nothing is a dead button.
        toast.error(noteCreateErrorMessage(cause));
      } finally {
        setBusyAction(null);
        setCreatingNoteIn(null);
        setNewNoteLabel("");
      }
    },
    [newNoteLabel, onSelectNote, noteHomes],
  );

  const handleNoteInputKeyDown = useCallback(
    (e: React.KeyboardEvent, folder: string) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirmCreateNote(folder);
      } else if (e.key === "Escape") {
        setCreatingNoteIn(null);
      }
    },
    [handleConfirmCreateNote],
  );

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-4", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col text-xs select-none overflow-auto",
        className,
      )}
    >
      {allFolders.map((folder) => {
        const isExpanded = expandedFolder === folder;
        const folderNotes = notesByFolder[folder] ?? [];
        const folderLabel = noteHomes.labelOf(folder) ?? "Home";
        const FolderIcon = noteHomes.byId.get(folder)?.isGeneral ? House : Box;

        return (
          <div key={folder}>
            {/* ── Folder row ──────────────────────── */}
            <button
              type="button"
              className={cn(
                "flex items-center gap-1 w-full px-1.5 py-[3px] hover:bg-accent/50 transition-colors",
                isExpanded && "bg-accent/30",
              )}
              onClick={() => handleToggleFolder(folder)}
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 shrink-0 transition-transform duration-150",
                  isExpanded && "rotate-90",
                )}
              />
              <FolderIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{folderLabel}</span>
              <span className="ml-auto text-[9px] text-muted-foreground/50 tabular-nums pr-0.5">
                <UntrustedCount value={folderNotes.length} trustworthy={!notesError} label="Notes in home" />
              </span>
            </button>

            {/* ── Notes list ──────────────────────── */}
            {isExpanded && (
              <div>
                {folderNotes.map((note) => (
                  <EntityRef
                    key={note.id}
                    token="note"
                    id={note.id}
                    name={note.label || "New Note"}
                    showIcon={false}
                    fill
                    onOpen={() => handleNoteClick(note)}
                    className={cn(
                      "flex items-center gap-1 w-full pl-5 pr-1.5 py-[3px] hover:bg-accent/40 transition-colors",
                      note.id === activeNoteId && "bg-primary/10 text-primary-ink",
                    )}
                    labelClassName="flex min-w-0 items-center gap-1"
                  >
                    <FileText className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                    <span className="truncate">{note.label || "New Note"}</span>
                  </EntityRef>
                ))}

                {/* ── Inline create note ────────── */}
                {creatingNoteIn === folder ? (
                  <div className="flex items-center gap-1 pl-5 pr-1.5 py-[2px]">
                    <FileText className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                    <input
                      ref={noteInputRef}
                      type="text"
                      value={newNoteLabel}
                      onChange={(e) => setNewNoteLabel(e.target.value)}
                      onKeyDown={(e) => handleNoteInputKeyDown(e, folder)}
                      onBlur={() => handleConfirmCreateNote(folder)}
                      placeholder="Note name..."
                      className="flex-1 min-w-0 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/40 border-b border-primary/40"
                      style={{ fontSize: "16px" }}
                      disabled={busyAction === `note-${folder}`}
                    />
                    {busyAction === `note-${folder}` && (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex items-center gap-1 w-full pl-5 pr-1.5 py-[3px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/30 transition-colors"
                    onClick={(e) => handleStartCreateNote(folder, e)}
                  >
                    <Plus className="h-3 w-3 shrink-0" />
                    <span className="text-[10px]">New note</span>
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
