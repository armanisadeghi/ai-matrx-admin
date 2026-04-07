"use client";

// @deprecated — Replaced by NoteSidebar (6-layer architecture).
// Kept for reference during migration.
//
// SidebarClient — VSCode-style tree sidebar for notes.
// Collapsible folder groups with chevrons, inline note list, context menus.
// Folder context menu: new note, rename, delete all.
// Mobile folder filter pills.
// Content search support.
// Syncs with NotesWorkspace via custom events for label/create/delete changes.

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Edit3,
  User,
  Briefcase,
  Lightbulb,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FolderPlus,
} from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { supabase } from "@/utils/supabase/client";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/slices/userSlice";
import {
  buildAgentShortcutMenu,
  fetchShortcutsForContext,
} from "@/features/agents/redux/agent-shortcuts/thunks";
import type { NoteSummary } from "../layout";
import NotesSidebarToolbar from "./NotesSidebarToolbar";
import NewNoteButton from "./NewNoteButton";
import ContextSwitcher from "./ContextSwitcher";

// Context menus and rename dialog — loaded only on first right-click
const SidebarNoteContextMenu = dynamic(
  () =>
    import("./SidebarContextMenus").then((m) => ({
      default: m.SidebarNoteContextMenu,
    })),
  { ssr: false },
);
const SidebarFolderContextMenu = dynamic(
  () =>
    import("./SidebarContextMenus").then((m) => ({
      default: m.SidebarFolderContextMenu,
    })),
  { ssr: false },
);
const RenameFolderDialog = dynamic(
  () =>
    import("./SidebarContextMenus").then((m) => ({
      default: m.RenameFolderDialog,
    })),
  { ssr: false },
);

const CreateFolderDialog = dynamic(
  () => import("./CreateFolderDialog"),
  { ssr: false },
);

const MobileNoteCards = dynamic(
  () => import("./MobileNoteCards"),
  { ssr: false },
);

const MobileFilterSheet = dynamic(
  () => import("./MobileFilterSheet"),
  { ssr: false },
);

import { getCategoryIconAndColor } from "@/features/notes/constants/folderCategories";
import { getIconComponent } from "@/components/official/IconResolver";

// Folder icon mapping (defaults)
const FOLDER_ICONS: Record<string, typeof FileText> = {
  Draft: Edit3,
  Personal: User,
  Business: Briefcase,
  Prompts: Lightbulb,
  Scratch: FileText,
};

const DEFAULT_FOLDER_ORDER = [
  "Draft",
  "Personal",
  "Business",
  "Prompts",
  "Scratch",
];
const ALL_FOLDERS = [...DEFAULT_FOLDER_ORDER];

type SortField = "updated_at" | "label" | "created_at";

interface SidebarClientProps {
  notes?: NoteSummary[];
  folderCounts?: Record<string, number>;
  allTags?: string[];
}

export default function SidebarClient({
  notes: initialNotes = [],
  folderCounts: initialFolderCounts = {},
  allTags: initialAllTags = [],
}: SidebarClientProps) {
  const [serverNotes, setServerNotes] = useState<NoteSummary[]>(initialNotes);
  const [folderCounts, setFolderCounts] =
    useState<Record<string, number>>(initialFolderCounts);
  const [allTags, setAllTags] = useState<string[]>(initialAllTags);
  const { id: userId } = useAppSelector(selectUser);
  const userIdRef = useRef<string | null>(null);
  const dispatch = useAppDispatch();

  // Fetch notes after mount — use userId from Redux (set by DeferredShellData), no redundant getUser() call
  useEffect(() => {
    if (!userId) return;

    // TEMPORARY ------ -JUST FOR TESTING
    dispatch(buildAgentShortcutMenu());

    dispatch(
      fetchShortcutsForContext({
        projectId: null,
        taskId: null,
      }),
    );

    //==================================================== -END TEMPORARY

    userIdRef.current = userId;
    supabase
      .from("notes")
      .select("id, label, folder_name, tags, updated_at, position")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const fetched: NoteSummary[] = data.map((n) => ({
          id: n.id,
          label: n.label ?? "Untitled",
          folder_name: n.folder_name ?? "Draft",
          tags: n.tags ?? [],
          updated_at: n.updated_at ?? "",
          position: n.position ?? 0,
        }));
        setServerNotes(fetched);
        const counts: Record<string, number> = {};
        for (const note of fetched) {
          counts[note.folder_name] = (counts[note.folder_name] ?? 0) + 1;
        }
        setFolderCounts(counts);
        setAllTags(Array.from(new Set(fetched.flatMap((n) => n.tags))).sort());
      });
  }, [userId]);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Local state overlays for live sync with workspace ─────────────────
  const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>(
    {},
  );
  const [folderOverrides, setFolderOverrides] = useState<
    Record<string, string>
  >({});
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
      const labelOv = labelOverrides[note.id];
      const folderOv = folderOverrides[note.id];
      if (labelOv || folderOv) {
        result.push({
          ...note,
          ...(labelOv && { label: labelOv }),
          ...(folderOv && { folder_name: folderOv }),
        });
      } else {
        result.push(note);
      }
    }
    return result;
  }, [serverNotes, localNotes, labelOverrides, folderOverrides, deletedIds]);

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
      setFolderOverrides((prev) => ({ ...prev, [noteId]: folder }));
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

  // ── Drag-and-drop state ─────────────────────────────────────────────
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // ── Rename folder dialog state ──────────────────────────────────────
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // ── Create folder dialog state ──────────────────────────────────────
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [mobileFilterTags, setMobileFilterTags] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState("");

  // Read filter state from URL
  const searchQuery = searchParams.get("q") ?? "";
  const sortField = (searchParams.get("sort") as SortField) ?? "updated_at";
  const sortOrder = (searchParams.get("order") as "asc" | "desc") ?? "desc";
  const mobileFolder = searchParams.get("folder") ?? "";

  // Active note from URL path
  const activeNoteId = pathname.startsWith("/ssr/notes/")
    ? (pathname.split("/ssr/notes/")[1]?.split("/")[0] ?? "")
    : "";

  // ── Folder expand/collapse state ──────────────────────────────────────
  const activeNoteFolder = useMemo(() => {
    if (!activeNoteId) return null;
    return notes.find((n) => n.id === activeNoteId)?.folder_name ?? null;
  }, [activeNoteId, notes]);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() =>
    activeNoteFolder ? new Set([activeNoteFolder]) : new Set(),
  );

  const toggleFolder = useCallback((folder: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  }, []);

  const treeRef = useRef<HTMLDivElement>(null);
  const prevActiveRef = useRef(activeNoteId);

  useEffect(() => {
    if (!activeNoteId || activeNoteId === prevActiveRef.current) {
      prevActiveRef.current = activeNoteId;
      return;
    }
    prevActiveRef.current = activeNoteId;

    if (activeNoteFolder && !expandedFolders.has(activeNoteFolder)) {
      setExpandedFolders((prev) => new Set(prev).add(activeNoteFolder));
    }

    requestAnimationFrame(() => {
      const el = treeRef.current?.querySelector(
        `[data-note-id="${activeNoteId}"]`,
      );
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [activeNoteId, activeNoteFolder, expandedFolders]);

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
      window.history.pushState(
        {},
        "",
        `/ssr/notes/${noteId}${qs ? `?${qs}` : ""}`,
      );
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
  }, []);

  // ── Folder operations ────────────────────────────────────────────────

  const createNoteInFolder = useCallback(
    async (folder: string) => {
      if (!userId) return;

      const { data: note, error } = await supabase
        .from("notes")
        .insert({
          user_id: userId,
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
    [navigateToNote, userId],
  );

  const renameFolder = useCallback(async (oldName: string, newName: string) => {
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
  }, []);

  const deleteFolderNotes = useCallback(
    async (folder: string) => {
      await supabase
        .from("notes")
        .update({ is_deleted: true })
        .eq("folder_name", folder)
        .eq("user_id", userIdRef.current ?? "");

      // Mark all notes in folder as deleted
      const ids = notes
        .filter((n) => n.folder_name === folder)
        .map((n) => n.id);
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
  const moveToFolder = useCallback(async (noteId: string, folder: string) => {
    const { supabase: sb } = await import("@/utils/supabase/client");
    await sb.from("notes").update({ folder_name: folder }).eq("id", noteId);
    window.dispatchEvent(
      new CustomEvent("notes:moved", { detail: { noteId, folder } }),
    );
    setContextMenu(null);
  }, []);

  return (
    <>
      {/* ── Adaptive toolbar ─────────────────────────────────────────────── */}
      <NotesSidebarToolbar
        searchQuery={searchQuery}
        sortField={sortField}
        sortOrder={sortOrder}
        allExpanded={allExpanded}
        onSearchChange={(v) => updateParams({ q: v || null })}
        onCycleSortField={cycleSortField}
        onToggleSortOrder={() =>
          updateParams({ order: sortOrder === "desc" ? "asc" : "desc" })
        }
        onToggleAll={toggleAll}
        newNoteSlot={<NewNoteButton />}
      />

      {/* ── Mobile Card View (lg:hidden) ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto lg:hidden">
        <MobileNoteCards
          notes={filteredNotes.map((n) => ({
            id: n.id,
            label: n.label,
            content: (n as any).content,
            folder_name: n.folder_name,
            tags: n.tags ?? [],
            updated_at: n.updated_at,
          }))}
          activeNoteId={activeNoteId}
          onSelectNote={navigateToNote}
          onCreateNote={() => createNoteInFolder(mobileFolder || "Draft")}
        />
      </div>

      {/* ── Mobile Filter Sheet ──────────────────────────────────────── */}
      <MobileFilterSheet
        open={showMobileFilter}
        onClose={() => setShowMobileFilter(false)}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={(field, order) => updateParams({ sort: field, order })}
        folders={orderedFolders}
        activeFolder={mobileFolder}
        onFolderChange={(f) => updateParams({ folder: f })}
        allTags={allTags}
        activeTags={mobileFilterTags}
        onTagsChange={setMobileFilterTags}
        resultCount={filteredNotes.length}
      />

      {/* ── VSCode-style Tree (hidden on mobile) ─────────────────────── */}
      <div
        ref={treeRef}
        className="flex-1 overflow-y-auto scrollbar-thin-auto hidden lg:block"
        onClick={contextMenu ? closeContextMenu : undefined}
      >
        {orderedFolders.map((folder) => {
          const folderNotes = notesByFolder.get(folder) ?? [];
          const isExpanded = expandedFolders.has(folder);
          const Icon = FOLDER_ICONS[folder] ?? Folder;
          const categoryMeta = getCategoryIconAndColor(folder);
          const folderColor = categoryMeta?.color;
          const count = folderNotes.length;

          // When searching, hide folders with no matching notes
          if (searchQuery && count === 0) return null;

          return (
            <div
              key={folder}
              onDragOver={(e) => {
                if (!draggedNoteId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverFolder(folder);
              }}
              onDragLeave={(e) => {
                // Only clear if leaving the folder container entirely
                if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
                  setDragOverFolder(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const noteId = e.dataTransfer.getData("text/plain");
                if (noteId && dragOverFolder) {
                  moveToFolder(noteId, dragOverFolder);
                }
                setDraggedNoteId(null);
                setDragOverFolder(null);
              }}
            >
              {/* Folder header */}
              <button
                className={cn(
                  "group flex items-center gap-1 w-full px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer transition-colors",
                  "hover:text-foreground hover:bg-accent/50",
                  "[&_svg]:w-3 [&_svg]:h-3 [&_svg]:shrink-0",
                  dragOverFolder === folder && "bg-primary/10 ring-1 ring-dashed ring-primary/40",
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
                  <ChevronDown className="w-3.5! h-3.5! opacity-60" />
                ) : (
                  <ChevronRight className="w-3.5! h-3.5! opacity-60" />
                )}
                {isExpanded ? (
                  <FolderOpen className="opacity-70" style={folderColor ? { color: folderColor } : undefined} />
                ) : (
                  <Icon className="opacity-70" style={folderColor ? { color: folderColor } : undefined} />
                )}
                <span className="flex-1 text-left truncate">{folder}</span>
                <span className="text-[0.625rem] font-normal opacity-50 tabular-nums">
                  {count}
                </span>
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
                          data-note-id={note.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedNoteId(note.id);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", note.id);
                          }}
                          onDragEnd={() => {
                            setDraggedNoteId(null);
                            setDragOverFolder(null);
                          }}
                          className={cn(
                            "flex items-center gap-1.5 w-full text-left px-2 py-[3px] rounded-sm cursor-pointer transition-colors group/item",
                            isActive
                              ? "bg-accent text-foreground"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                            draggedNoteId === note.id && "opacity-40",
                          )}
                          onClick={() => navigateToNote(note.id)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              noteId: note.id,
                            });
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
      <div className="flex items-center gap-1.5 px-2 py-1 overflow-x-auto scrollbar-thin-auto lg:hidden shrink-0 notes-mobile-folder-pills">
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
            onClick={() =>
              updateParams({ folder: mobileFolder === f ? null : f })
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Context menu for notes ─────────────────────────────────────── */}
      {contextMenu && (
        <SidebarNoteContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          noteId={contextMenu.noteId}
          noteFolder={
            notes.find((n) => n.id === contextMenu.noteId)?.folder_name
          }
          orderedFolders={orderedFolders}
          onOpen={() => navigateToNote(contextMenu.noteId)}
          onDuplicate={() => navigateToNote(contextMenu.noteId)}
          onExport={() => navigateToNote(contextMenu.noteId)}
          onMove={(folder) => moveToFolder(contextMenu.noteId, folder)}
          onDelete={async () => {
            const { supabase: sb } = await import("@/utils/supabase/client");
            await sb
              .from("notes")
              .update({ is_deleted: true })
              .eq("id", contextMenu.noteId);
            window.dispatchEvent(
              new CustomEvent("notes:deleted", {
                detail: { noteId: contextMenu.noteId },
              }),
            );
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* ── Folder context menu ──────────────────────────────────────────── */}
      {folderContextMenu && (
        <SidebarFolderContextMenu
          x={folderContextMenu.x}
          y={folderContextMenu.y}
          folder={folderContextMenu.folder}
          isDefaultFolder={DEFAULT_FOLDER_ORDER.includes(
            folderContextMenu.folder,
          )}
          isExpanded={expandedFolders.has(folderContextMenu.folder)}
          onNewNote={() => createNoteInFolder(folderContextMenu.folder)}
          onRename={() => {
            setRenamingFolder(folderContextMenu.folder);
            setRenameValue(folderContextMenu.folder);
          }}
          onToggle={() => toggleFolder(folderContextMenu.folder)}
          onDeleteAll={() => deleteFolderNotes(folderContextMenu.folder)}
          onClose={() => setFolderContextMenu(null)}
        />
      )}

      {/* ── Rename folder dialog ─────────────────────────────────────────── */}
      {renamingFolder && (
        <RenameFolderDialog
          folder={renamingFolder}
          value={renameValue}
          onChange={setRenameValue}
          onConfirm={() => renameFolder(renamingFolder, renameValue)}
          onCancel={() => setRenamingFolder(null)}
        />
      )}

      {/* ── Context switcher + Create folder (bottom of sidebar) ────────── */}
      <div className="shrink-0 px-2 py-1.5 border-t border-border/30 hidden lg:block">
        <ContextSwitcher />
      </div>

      <div className="shrink-0 px-2 py-1.5 border-t border-border/30 hidden lg:block">
        <button
          className="flex items-center gap-1.5 w-full px-2 py-1 text-[0.6875rem] text-muted-foreground cursor-pointer transition-colors hover:text-foreground hover:bg-accent/50 rounded-md [&_svg]:w-3 [&_svg]:h-3"
          onClick={() => setShowCreateFolder(true)}
        >
          <FolderPlus /> New Folder
        </button>
      </div>

      {/* Create Folder Dialog with Category Picker */}
      <CreateFolderDialog
        open={showCreateFolder}
        onOpenChange={setShowCreateFolder}
        onCreateFolder={createFolder}
        existingFolders={orderedFolders}
      />
    </>
  );
}
