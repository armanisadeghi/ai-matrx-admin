"use client";

// SidebarClient — VSCode-style tree sidebar for notes.
// Collapsible folder groups with chevrons, inline note list, context menus.
// Folder context menu: new note, rename, delete all.
// Mobile folder filter pills.
// Content search support.
// Syncs with NotesWorkspace via custom events for label/create/delete changes.

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ChevronsDownUp,
  ChevronsUpDown,
  FolderPlus,
  Pencil,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/utils/supabase/client";
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

type SortField = "updated_at" | "label" | "created_at";

interface SidebarClientProps {
  notes?: NoteSummary[];
  folderCounts?: Record<string, number>;
  allTags?: string[];
}

export default function SidebarClient({ notes: initialNotes = [], folderCounts: initialFolderCounts = {}, allTags: initialAllTags = [] }: SidebarClientProps) {
  const [serverNotes, setServerNotes] = useState<NoteSummary[]>(initialNotes);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>(initialFolderCounts);
  const [allTags, setAllTags] = useState<string[]>(initialAllTags);
  const userIdRef = useRef<string | null>(null);

  // Fetch notes after mount — directly from Supabase, no server roundtrip
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      userIdRef.current = user.id;
      supabase
        .from('notes')
        .select('id, label, folder_name, tags, updated_at, position')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false })
        .then(({ data }) => {
          if (!data) return;
          const fetched: NoteSummary[] = data.map(n => ({
            id: n.id,
            label: n.label ?? 'Untitled',
            folder_name: n.folder_name ?? 'Draft',
            tags: n.tags ?? [],
            updated_at: n.updated_at ?? '',
            position: n.position ?? 0,
          }));
          setServerNotes(fetched);
          const counts: Record<string, number> = {};
          for (const note of fetched) {
            counts[note.folder_name] = (counts[note.folder_name] ?? 0) + 1;
          }
          setFolderCounts(counts);
          setAllTags(Array.from(new Set(fetched.flatMap(n => n.tags))).sort());
        });
    });
  }, []);
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

  // ── Folder context menu state ───────────────────────────────────────
  const [folderContextMenu, setFolderContextMenu] = useState<{
    x: number;
    y: number;
    folder: string;
  } | null>(null);

  // ── Rename folder dialog state ──────────────────────────────────────
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // ── Create folder dialog state ──────────────────────────────────────
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderSubmenu, setShowFolderSubmenu] = useState(false);

  // ── Folder expand/collapse state ──────────────────────────────────────
  const activeNoteFolder = useMemo(() => {
    const activeId = pathname.startsWith("/ssr/notes/")
      ? pathname.split("/ssr/notes/")[1]?.split("/")[0] ?? ""
      : "";
    if (!activeId) return null;
    return serverNotes.find((n) => n.id === activeId)?.folder_name ?? null;
  }, [pathname, serverNotes]);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => activeNoteFolder ? new Set([activeNoteFolder]) : new Set(),
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
  const sortField = (searchParams.get("sort") as SortField) ?? "updated_at";
  const sortOrder = (searchParams.get("order") as "asc" | "desc") ?? "desc";
  const mobileFolder = searchParams.get("folder") ?? "";

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

  // Sort field cycle: updated_at → label → created_at → updated_at
  const cycleSortField = useCallback(() => {
    const fields: SortField[] = ["updated_at", "label", "created_at"];
    const idx = fields.indexOf(sortField);
    const next = fields[(idx + 1) % fields.length];
    updateParams({ sort: next === "updated_at" ? null : next });
  }, [sortField, updateParams]);

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

    // Mobile folder filter
    if (mobileFolder) {
      result = result.filter((n) => n.folder_name === mobileFolder);
    }

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
      // created_at not in NoteSummary, fall through to updated_at
      const cmp = a.updated_at.localeCompare(b.updated_at);
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [notes, searchQuery, sortField, sortOrder, mobileFolder]);

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

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    setFolderContextMenu(null);
    setShowFolderSubmenu(false);
  }, []);

  // ── Folder operations ────────────────────────────────────────────────

  const createNoteInFolder = useCallback(
    async (folder: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;

      const { data: note, error } = await supabase
        .from("notes")
        .insert({
          user_id: userData.user.id,
          label: "New Note",
          content: "",
          folder_name: folder,
          tags: [],
          metadata: {},
          position: 0,
        })
        .select("id, label, folder_name, tags, updated_at, position")
        .single();

      if (error || !note) return;

      window.dispatchEvent(
        new CustomEvent("notes:created", {
          detail: {
            id: note.id,
            label: note.label ?? "New Note",
            folder_name: note.folder_name ?? folder,
            tags: (note.tags as string[]) ?? [],
            updated_at: note.updated_at ?? new Date().toISOString(),
            position: note.position ?? 0,
          } satisfies NoteSummary,
        }),
      );

      navigateToNote(note.id);
    },
    [navigateToNote],
  );

  const renameFolder = useCallback(
    async (oldName: string, newName: string) => {
      if (!newName.trim() || newName === oldName) return;
      await supabase
        .from("notes")
        .update({ folder_name: newName.trim() })
        .eq("folder_name", oldName)
        .eq("user_id", userIdRef.current ?? "");

      // Update local state
      setServerNotes((prev) =>
        prev.map((n) =>
          n.folder_name === oldName ? { ...n, folder_name: newName.trim() } : n,
        ),
      );
      setLocalNotes((prev) =>
        prev.map((n) =>
          n.folder_name === oldName ? { ...n, folder_name: newName.trim() } : n,
        ),
      );
      setRenamingFolder(null);
    },
    [],
  );

  const deleteFolderNotes = useCallback(
    async (folder: string) => {
      await supabase
        .from("notes")
        .update({ is_deleted: true })
        .eq("folder_name", folder)
        .eq("user_id", userIdRef.current ?? "");

      // Mark all notes in folder as deleted
      const ids = notes.filter((n) => n.folder_name === folder).map((n) => n.id);
      setDeletedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
      for (const id of ids) {
        window.dispatchEvent(
          new CustomEvent("notes:deleted", { detail: { noteId: id } }),
        );
      }
    },
    [notes],
  );

  const createFolder = useCallback(
    (name: string) => {
      if (!name.trim()) return;
      // Just expand the new folder — it will appear when a note is created in it
      setExpandedFolders((prev) => new Set(prev).add(name.trim()));
      setShowCreateFolder(false);
      setNewFolderName("");
      // Create a note in the new folder to materialize it
      createNoteInFolder(name.trim());
    },
    [createNoteInFolder],
  );

  // Collapse / expand all folders
  const allExpanded = expandedFolders.size >= orderedFolders.length;
  const toggleAll = useCallback(() => {
    if (allExpanded) {
      setExpandedFolders(new Set());
    } else {
      setExpandedFolders(new Set(orderedFolders));
    }
  }, [allExpanded, orderedFolders]);

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
      {/* ── Search bar — fixed just below main header, same pattern as the dock ── */}
      <div className="notes-search-bar">
        {/* Search input — transparent wrapper, glass pill fills the height */}
        <div className="notes-search-input-wrap">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              className="w-full h-[1.875rem] pl-8 pr-2 shell-glass rounded-full text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors"
              style={{ fontSize: "16px" }}
              type="text"
              placeholder="Search notes..."
              defaultValue={searchQuery}
              onChange={(e) => updateParams({ q: e.target.value || null })}
              aria-label="Search notes"
            />
          </div>
        </div>
        {/* Icon buttons — transparent 44px tap target, small glass pill inside */}
        <div className="notes-search-tap">
          <button
            className="flex items-center justify-center w-[1.875rem] h-[1.875rem] rounded-full shell-glass shell-tactile text-muted-foreground cursor-pointer hover:text-foreground [&_svg]:w-3.5 [&_svg]:h-3.5"
            onClick={toggleAll}
            title={allExpanded ? "Collapse all folders" : "Expand all folders"}
            aria-label={allExpanded ? "Collapse all folders" : "Expand all folders"}
          >
            {allExpanded ? <ChevronsDownUp /> : <ChevronsUpDown />}
          </button>
        </div>
        <div className="notes-search-tap">
          <button
            className={cn(
              "flex items-center justify-center w-[1.875rem] h-[1.875rem] rounded-full shell-glass shell-tactile text-muted-foreground cursor-pointer hover:text-foreground [&_svg]:w-3.5 [&_svg]:h-3.5",
              sortField !== "updated_at" && "text-amber-600 dark:text-amber-400",
            )}
            onClick={cycleSortField}
            title={`Sort by: ${sortField === "updated_at" ? "date" : sortField === "label" ? "name" : "created"}`}
            aria-label="Cycle sort field"
          >
            <ArrowUpDown />
          </button>
        </div>
        <div className="notes-search-tap">
          <button
            className={cn(
              "flex items-center justify-center w-[1.875rem] h-[1.875rem] rounded-full shell-glass shell-tactile text-muted-foreground cursor-pointer hover:text-foreground [&_svg]:w-3.5 [&_svg]:h-3.5",
              sortOrder === "asc" && "text-amber-600 dark:text-amber-400",
            )}
            onClick={() => updateParams({ order: sortOrder === "desc" ? "asc" : "desc" })}
            title={`Sort ${sortOrder === "desc" ? "oldest first" : "newest first"}`}
            aria-label="Toggle sort order"
          >
            {sortOrder === "desc" ? <ChevronDown /> : <ChevronUp />}
          </button>
        </div>
        <div className="notes-search-tap">
          <NewNoteButton />
        </div>
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
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setFolderContextMenu({ x: e.clientX, y: e.clientY, folder });
                  setContextMenu(null);
                }}
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

      {/* ── Mobile folder filter pills ─── visible only on mobile ─────── */}
      <div className="flex items-center gap-1.5 px-2 py-1 overflow-x-auto notes-scrollable lg:hidden shrink-0">
        <button
          className={cn(
            "text-[0.625rem] px-2.5 py-0.5 rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0",
            !mobileFolder
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground hover:bg-accent/50",
          )}
          onClick={() => updateParams({ folder: null })}
        >
          All
        </button>
        {orderedFolders.map((f) => (
          <button
            key={f}
            className={cn(
              "text-[0.625rem] px-2.5 py-0.5 rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0",
              mobileFolder === f
                ? "bg-accent text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50",
            )}
            onClick={() => updateParams({ folder: mobileFolder === f ? null : f })}
          >
            {f}
          </button>
        ))}
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

          {/* Move to folder — collapsible second tier */}
          <div className="h-px my-1 mx-1.5 bg-border" />
          <button
            className="flex items-center justify-between gap-2 w-full px-2.5 py-1.5 text-xs text-foreground rounded-md cursor-pointer transition-colors hover:bg-accent [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); setShowFolderSubmenu((v) => !v); }}
          >
            <span className="flex items-center gap-2"><FolderInput /> Move to folder</span>
            <ChevronRight className={cn("!w-3 !h-3 transition-transform", showFolderSubmenu && "rotate-90")} />
          </button>
          {showFolderSubmenu && (
            <div className="ml-3 max-h-[200px] overflow-y-auto notes-scrollable">
              {orderedFolders.map((folder) => {
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
            </div>
          )}

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

      {/* ── Folder context menu ──────────────────────────────────────────── */}
      {folderContextMenu && (
        <div
          className="fixed z-[100] min-w-[200px] p-1 bg-card/95 backdrop-blur-2xl saturate-150 border border-border rounded-lg shadow-lg"
          style={{ top: folderContextMenu.y, left: folderContextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-foreground rounded-md cursor-pointer transition-colors hover:bg-accent [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground"
            onClick={() => {
              createNoteInFolder(folderContextMenu.folder);
              setFolderContextMenu(null);
            }}
          >
            <Plus /> New Note in {folderContextMenu.folder}
          </button>
          {!DEFAULT_FOLDER_ORDER.includes(folderContextMenu.folder) && (
            <button
              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-foreground rounded-md cursor-pointer transition-colors hover:bg-accent [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground"
              onClick={() => {
                setRenamingFolder(folderContextMenu.folder);
                setRenameValue(folderContextMenu.folder);
                setFolderContextMenu(null);
              }}
            >
              <Pencil /> Rename Folder
            </button>
          )}
          <button
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-foreground rounded-md cursor-pointer transition-colors hover:bg-accent [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground"
            onClick={() => {
              toggleFolder(folderContextMenu.folder);
              setFolderContextMenu(null);
            }}
          >
            {expandedFolders.has(folderContextMenu.folder) ? <ChevronsDownUp /> : <ChevronsUpDown />}
            {expandedFolders.has(folderContextMenu.folder) ? "Collapse" : "Expand"}
          </button>
          <div className="h-px my-1 mx-1.5 bg-border" />
          <button
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-destructive rounded-md cursor-pointer transition-colors hover:bg-destructive/10 [&_svg]:w-3.5 [&_svg]:h-3.5"
            onClick={() => {
              deleteFolderNotes(folderContextMenu.folder);
              setFolderContextMenu(null);
            }}
          >
            <Trash2 /> Delete All Notes
          </button>
        </div>
      )}

      {/* ── Rename folder inline input ────────────────────────────────────── */}
      {renamingFolder && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center"
          onClick={() => setRenamingFolder(null)}
        >
          <div
            className="p-4 bg-card/95 backdrop-blur-2xl saturate-150 border border-border rounded-xl shadow-xl min-w-[280px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-medium mb-2">
              Rename &ldquo;{renamingFolder}&rdquo;
            </h3>
            <input
              className="w-full h-8 px-3 text-sm bg-muted rounded-lg border border-border outline-none"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") renameFolder(renamingFolder, renameValue);
                if (e.key === "Escape") setRenamingFolder(null);
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                className="px-3 py-1 text-xs rounded-md border border-border text-muted-foreground cursor-pointer hover:bg-accent"
                onClick={() => setRenamingFolder(null)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90"
                onClick={() => renameFolder(renamingFolder, renameValue)}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create folder button (bottom of sidebar) ─────────────────────── */}
      <div className="shrink-0 px-2 py-1.5 border-t border-border/30 hidden lg:block">
        {showCreateFolder ? (
          <div className="flex items-center gap-1.5">
            <input
              className="flex-1 h-7 px-2.5 text-xs bg-muted rounded-md border border-border outline-none min-w-0"
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createFolder(newFolderName);
                if (e.key === "Escape") { setShowCreateFolder(false); setNewFolderName(""); }
              }}
              autoFocus
            />
            <button
              className="h-7 px-2 text-[0.625rem] font-medium rounded-md bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90"
              onClick={() => createFolder(newFolderName)}
            >
              Create
            </button>
          </div>
        ) : (
          <button
            className="flex items-center gap-1.5 w-full px-2 py-1 text-[0.6875rem] text-muted-foreground cursor-pointer transition-colors hover:text-foreground hover:bg-accent/50 rounded-md [&_svg]:w-3 [&_svg]:h-3"
            onClick={() => setShowCreateFolder(true)}
          >
            <FolderPlus /> New Folder
          </button>
        )}
      </div>
    </>
  );
}
