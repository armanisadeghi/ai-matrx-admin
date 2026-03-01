"use client";

// SidebarClient — VSCode-style tree sidebar for notes.
// Collapsible folder groups with chevrons, inline note list, context menus.
// Syncs with NotesWorkspace via custom events for label/create/delete changes.

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  FileText,
  Edit3,
  User,
  Briefcase,
  Lightbulb,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  NotebookPen,
  Trash2,
  Copy,
  Download,
  FolderInput,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteSummary } from "../layout";
import NewNoteButton from "./NewNoteButton";

// Folder icon mapping
const FOLDER_ICONS: Record<string, typeof FileText> = {
  Draft: Edit3,
  Personal: User,
  Business: Briefcase,
  Prompts: Lightbulb,
  Scratch: FileText,
};

const DEFAULT_FOLDER_ORDER = ["Draft", "Personal", "Business", "Prompts", "Scratch"];
const ALL_FOLDERS = [...DEFAULT_FOLDER_ORDER];

interface SidebarClientProps {
  notes: NoteSummary[];
  folderCounts: Record<string, number>;
  allTags: string[];
}

export default function SidebarClient({ notes: serverNotes, folderCounts, allTags }: SidebarClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Local state overlays for live sync with workspace ─────────────────
  const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>({});
  const [localNotes, setLocalNotes] = useState<NoteSummary[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());

  // Merge server + local notes, apply overrides, remove deleted
  const notes = useMemo(() => {
    const merged = [...serverNotes, ...localNotes];
    const seen = new Set<string>();
    const result: NoteSummary[] = [];
    for (const note of merged) {
      if (seen.has(note.id) || deletedIds.has(note.id)) continue;
      seen.add(note.id);
      const override = labelOverrides[note.id];
      result.push(override ? { ...note, label: override } : note);
    }
    return result;
  }, [serverNotes, localNotes, labelOverrides, deletedIds]);

  // ── Listen for workspace events ───────────────────────────────────────

  useEffect(() => {
    const onLabelChange = (e: Event) => {
      const { noteId, label } = (e as CustomEvent).detail;
      setLabelOverrides((prev) => ({ ...prev, [noteId]: label }));
    };
    const onNoteCreated = (e: Event) => {
      const summary = (e as CustomEvent).detail as NoteSummary;
      setLocalNotes((prev) => [summary, ...prev]);
    };
    const onNoteDeleted = (e: Event) => {
      const { noteId } = (e as CustomEvent).detail;
      setDeletedIds((prev) => new Set(prev).add(noteId));
    };
    const onNoteMoved = (e: Event) => {
      const { noteId, folder } = (e as CustomEvent).detail;
      // Update both local and server note folder
      setLocalNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, folder_name: folder } : n)),
      );
    };

    window.addEventListener("notes:labelChange", onLabelChange);
    window.addEventListener("notes:created", onNoteCreated);
    window.addEventListener("notes:deleted", onNoteDeleted);
    window.addEventListener("notes:moved", onNoteMoved);
    return () => {
      window.removeEventListener("notes:labelChange", onLabelChange);
      window.removeEventListener("notes:created", onNoteCreated);
      window.removeEventListener("notes:deleted", onNoteDeleted);
      window.removeEventListener("notes:moved", onNoteMoved);
    };
  }, []);

  // ── Context menu state ────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    noteId: string;
  } | null>(null);

  // ── Folder expand/collapse state ──────────────────────────────────────
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(Object.keys(folderCounts)),
  );

  const toggleFolder = useCallback((folder: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  }, []);

  // Read filter state from URL
  const searchQuery = searchParams.get("q") ?? "";
  const sortField = (searchParams.get("sort") as "updated_at" | "label") ?? "updated_at";
  const sortOrder = (searchParams.get("order") as "asc" | "desc") ?? "desc";

  // Active note from URL path
  const activeNoteId = pathname.startsWith("/ssr/notes/")
    ? pathname.split("/ssr/notes/")[1]?.split("/")[0] ?? ""
    : "";

  // ── pushState URL helpers ─────────────────────────────────────────────

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      const url = `${pathname}${qs ? `?${qs}` : ""}`;
      window.history.replaceState({}, "", url);
    },
    [pathname, searchParams],
  );

  const navigateToNote = useCallback(
    (noteId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const tabs = params.get("tabs")?.split(",").filter(Boolean) ?? [];
      if (!tabs.includes(noteId)) {
        tabs.push(noteId);
        params.set("tabs", tabs.join(","));
      }
      const qs = params.toString();
      window.history.pushState({}, "", `/ssr/notes/${noteId}${qs ? `?${qs}` : ""}`);
    },
    [searchParams],
  );

  // ── Filter + sort ─────────────────────────────────────────────────────

  const filteredNotes = useMemo(() => {
    let result = notes;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    result = [...result].sort((a, b) => {
      if (sortField === "label") {
        const cmp = a.label.localeCompare(b.label);
        return sortOrder === "asc" ? cmp : -cmp;
      }
      const cmp = a.updated_at.localeCompare(b.updated_at);
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [notes, searchQuery, sortField, sortOrder]);

  // Group by folder
  const notesByFolder = useMemo(() => {
    const map = new Map<string, NoteSummary[]>();
    for (const note of filteredNotes) {
      const folder = note.folder_name;
      if (!map.has(folder)) map.set(folder, []);
      map.get(folder)!.push(note);
    }
    return map;
  }, [filteredNotes]);

  // Ordered folders — always show default folders, plus any custom ones
  const orderedFolders = useMemo(() => {
    const allFolderNames = new Set([
      ...DEFAULT_FOLDER_ORDER,
      ...Object.keys(folderCounts),
      ...notesByFolder.keys(),
    ]);
    const defaults = DEFAULT_FOLDER_ORDER.filter((f) => allFolderNames.has(f));
    const custom = [...allFolderNames]
      .filter((f) => !DEFAULT_FOLDER_ORDER.includes(f))
      .sort();
    return [...defaults, ...custom];
  }, [folderCounts, notesByFolder]);

  // Format relative time
  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // Move note to folder
  const moveToFolder = useCallback(
    async (noteId: string, folder: string) => {
      const { supabase: sb } = await import("@/utils/supabase/client");
      await sb.from("notes").update({ folder_name: folder }).eq("id", noteId);
      window.dispatchEvent(
        new CustomEvent("notes:moved", { detail: { noteId, folder } }),
      );
      setContextMenu(null);
    },
    [],
  );

  return (
    <>
      {/* ── Search + Sort + New Note ───────────────────────────────────── */}
      <div className="flex items-center gap-1 px-2 pt-2 pb-1 shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            className="w-full h-7 pl-7 pr-2 text-xs bg-muted/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-ring focus:bg-muted"
            type="text"
            placeholder="Search notes..."
            defaultValue={searchQuery}
            onChange={(e) => updateParams({ q: e.target.value || null })}
            aria-label="Search notes"
          />
        </div>
        <button
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-md border border-border bg-background text-muted-foreground cursor-pointer transition-colors shrink-0",
            "hover:bg-accent hover:text-foreground",
            "[&_svg]:w-3 [&_svg]:h-3",
            sortOrder === "asc" && "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
          )}
          onClick={() => updateParams({ order: sortOrder === "desc" ? "asc" : "desc" })}
          title={`Sort ${sortOrder === "desc" ? "oldest first" : "newest first"}`}
          aria-label="Toggle sort order"
        >
          {sortOrder === "desc" ? <ChevronDown /> : <ChevronUp />}
        </button>
        <NewNoteButton />
      </div>

      {/* ── VSCode-style Tree ──────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto notes-scrollable"
        onClick={contextMenu ? closeContextMenu : undefined}
      >
        {orderedFolders.map((folder) => {
          const folderNotes = notesByFolder.get(folder) ?? [];
          const isExpanded = expandedFolders.has(folder);
          const Icon = FOLDER_ICONS[folder] ?? Folder;
          const count = folderNotes.length;

          // When searching, hide folders with no matching notes
          if (searchQuery && count === 0) return null;

          return (
            <div key={folder}>
              {/* Folder header */}
              <button
                className={cn(
                  "group flex items-center gap-1 w-full px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer transition-colors",
                  "hover:text-foreground hover:bg-accent/50",
                  "[&_svg]:w-3 [&_svg]:h-3 [&_svg]:shrink-0",
                )}
                onClick={() => toggleFolder(folder)}
              >
                {isExpanded ? (
                  <ChevronDown className="!w-3.5 !h-3.5 opacity-60" />
                ) : (
                  <ChevronRight className="!w-3.5 !h-3.5 opacity-60" />
                )}
                {isExpanded ? <FolderOpen className="opacity-70" /> : <Icon className="opacity-70" />}
                <span className="flex-1 text-left truncate">{folder}</span>
                <span className="text-[0.625rem] font-normal opacity-50 tabular-nums">{count}</span>
              </button>

              {/* Notes within folder */}
              {isExpanded && (
                <div className="ml-2">
                  {folderNotes.length === 0 ? (
                    <div className="px-5 py-2 text-[0.625rem] text-muted-foreground/50 italic">
                      Empty
                    </div>
                  ) : (
                    folderNotes.map((note) => {
                      const isActive = activeNoteId === note.id;
                      return (
                        <button
                          key={note.id}
                          className={cn(
                            "flex items-center gap-1.5 w-full text-left px-2 py-[3px] rounded-sm cursor-pointer transition-colors group/item",
                            isActive
                              ? "bg-accent text-foreground"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                          )}
                          onClick={() => navigateToNote(note.id)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, noteId: note.id });
                          }}
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0 opacity-50" />
                          <span className="flex-1 text-xs truncate leading-tight">
                            {note.label}
                          </span>
                          <span className="text-[0.625rem] opacity-40 tabular-nums shrink-0">
                            {formatTime(note.updated_at)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state when all folders are empty */}
        {filteredNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground [&_svg]:w-8 [&_svg]:h-8 [&_svg]:opacity-30">
            <FileText />
            <span className="text-xs">
              {searchQuery ? "No notes match your search" : "No notes yet"}
            </span>
          </div>
        )}
      </div>

      {/* ── Context menu for notes ─────────────────────────────────────── */}
      {contextMenu && (
        <div
          className="fixed z-[100] min-w-[200px] p-1 bg-card/95 backdrop-blur-2xl saturate-150 border border-border rounded-lg shadow-lg"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-foreground rounded-md cursor-pointer transition-colors hover:bg-accent [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground"
            onClick={() => { navigateToNote(contextMenu.noteId); setContextMenu(null); }}
          >
            <NotebookPen /> Open Note
          </button>
          <button
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-foreground rounded-md cursor-pointer transition-colors hover:bg-accent [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground"
            onClick={async () => {
              const { data: userData } = await (await import("@/utils/supabase/client")).supabase.auth.getUser();
              if (!userData?.user?.id) return;
              navigateToNote(contextMenu.noteId);
              setContextMenu(null);
            }}
          >
            <Copy /> Duplicate
          </button>
          <button
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-foreground rounded-md cursor-pointer transition-colors hover:bg-accent [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground"
            onClick={() => { navigateToNote(contextMenu.noteId); setContextMenu(null); }}
          >
            <Download /> Export
          </button>

          {/* Move to folder submenu */}
          <div className="h-px my-1 mx-1.5 bg-border" />
          <div className="px-2.5 py-1 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider">
            Move to folder
          </div>
          {ALL_FOLDERS.map((folder) => {
            const currentFolder = notes.find((n) => n.id === contextMenu.noteId)?.folder_name;
            const isCurrentFolder = currentFolder === folder;
            return (
              <button
                key={folder}
                className={cn(
                  "flex items-center gap-2 w-full px-2.5 py-1 text-xs rounded-md cursor-pointer transition-colors [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground",
                  isCurrentFolder
                    ? "text-amber-600 dark:text-amber-400 bg-amber-500/5"
                    : "text-foreground hover:bg-accent",
                )}
                onClick={() => moveToFolder(contextMenu.noteId, folder)}
                disabled={isCurrentFolder}
              >
                <FolderInput />
                {folder}
                {isCurrentFolder && <span className="ml-auto text-[0.625rem] opacity-50">current</span>}
              </button>
            );
          })}

          <div className="h-px my-1 mx-1.5 bg-border" />
          <button
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-destructive rounded-md cursor-pointer transition-colors hover:bg-destructive/10 [&_svg]:w-3.5 [&_svg]:h-3.5"
            onClick={async () => {
              const { supabase: sb } = await import("@/utils/supabase/client");
              await sb.from("notes").update({ is_deleted: true }).eq("id", contextMenu.noteId);
              window.dispatchEvent(
                new CustomEvent("notes:deleted", { detail: { noteId: contextMenu.noteId } }),
              );
              setContextMenu(null);
            }}
          >
            <Trash2 /> Delete Note
          </button>
        </div>
      )}
    </>
  );
}
