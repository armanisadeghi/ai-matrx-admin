"use client";

// SidebarClient — Client island for the notes sidebar.
// Receives server-fetched note list as props. Handles search, folder filtering,
// and sort — all via URL searchParams for bookmarkable, shareable state.
// Uses window.history.pushState for instant navigation (no server roundtrip).

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  Search,
  FileText,
  Edit3,
  User,
  Briefcase,
  Lightbulb,
  Folder,
  ChevronDown,
  ChevronUp,
  NotebookPen,
  Trash2,
  Copy,
  Download,
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

interface SidebarClientProps {
  notes: NoteSummary[];
  folderCounts: Record<string, number>;
  allTags: string[];
}

export default function SidebarClient({ notes, folderCounts, allTags }: SidebarClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    noteId: string;
  } | null>(null);

  // Read filter state from URL
  const activeFolder = searchParams.get("folder") ?? "";
  const searchQuery = searchParams.get("q") ?? "";
  const activeTags = searchParams.get("tags")?.split(",").filter(Boolean) ?? [];
  const sortField = (searchParams.get("sort") as "updated_at" | "label") ?? "updated_at";
  const sortOrder = (searchParams.get("order") as "asc" | "desc") ?? "desc";

  // Active note from URL path
  const activeNoteId = pathname.startsWith("/ssr/notes/")
    ? pathname.split("/ssr/notes/")[1]?.split("/")[0] ?? ""
    : "";

  // ── pushState URL helpers (instant, no server roundtrip) ────────────────

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

  // ── Filter + sort ───────────────────────────────────────────────────────

  const filteredNotes = useMemo(() => {
    let result = notes;

    if (activeFolder) {
      result = result.filter((n) => n.folder_name === activeFolder);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (activeTags.length > 0) {
      result = result.filter((n) =>
        activeTags.every((t) => n.tags.includes(t)),
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
  }, [notes, activeFolder, searchQuery, activeTags, sortField, sortOrder]);

  // Ordered folders
  const orderedFolders = useMemo(() => {
    const allFolders = Object.keys(folderCounts);
    const defaults = DEFAULT_FOLDER_ORDER.filter((f) => allFolders.includes(f));
    const custom = allFolders.filter((f) => !DEFAULT_FOLDER_ORDER.includes(f)).sort();
    return [...defaults, ...custom];
  }, [folderCounts]);

  // Format relative time
  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // Close context menu on click elsewhere
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  return (
    <>
      {/* Search + Sort + New Note */}
      <div className="flex items-center gap-1.5 px-2.5 pt-2.5 pb-1.5 shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            className="w-full h-8 pl-7 pr-2 text-xs bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-ring focus:bg-muted"
            type="text"
            placeholder="Search notes..."
            defaultValue={searchQuery}
            onChange={(e) => {
              updateParams({ q: e.target.value || null });
            }}
            aria-label="Search notes"
          />
        </div>
        <button
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-background text-muted-foreground cursor-pointer transition-colors shrink-0",
            "hover:bg-accent hover:text-foreground",
            "[&_svg]:w-3.5 [&_svg]:h-3.5",
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

      {/* Folder chips */}
      <div className="flex flex-wrap gap-1 px-2.5 py-1 shrink-0">
        <button
          className={cn(
            "flex items-center gap-1 px-2 py-1 text-[0.6875rem] font-medium rounded-md border cursor-pointer transition-colors",
            "[&_svg]:w-3 [&_svg]:h-3",
            !activeFolder
              ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
              : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
          onClick={() => updateParams({ folder: null })}
        >
          All
          <span className="text-[0.625rem] opacity-60">{notes.length}</span>
        </button>
        {orderedFolders.map((folder) => {
          const Icon = FOLDER_ICONS[folder] ?? Folder;
          const isActive = activeFolder === folder;
          return (
            <button
              key={folder}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-[0.6875rem] font-medium rounded-md border cursor-pointer transition-colors",
                "[&_svg]:w-3 [&_svg]:h-3",
                isActive
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              onClick={() =>
                updateParams({ folder: isActive ? null : folder })
              }
            >
              <Icon />
              {folder}
              <span className="text-[0.625rem] opacity-60">{folderCounts[folder]}</span>
            </button>
          );
        })}
      </div>

      <div className="h-px mx-2.5 bg-border shrink-0" />

      {/* Note list */}
      <div
        className="flex-1 overflow-y-auto px-1.5 py-1 notes-scrollable"
        onClick={contextMenu ? closeContextMenu : undefined}
      >
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground [&_svg]:w-8 [&_svg]:h-8 [&_svg]:opacity-30">
            <FileText />
            <span className="text-xs">
              {searchQuery
                ? "No notes match your search"
                : activeFolder
                  ? `No notes in ${activeFolder}`
                  : "No notes yet"}
            </span>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isActive = activeNoteId === note.id;
            return (
              <button
                key={note.id}
                className={cn(
                  "flex flex-col gap-0.5 w-full text-left px-2.5 py-2 mx-0.5 rounded-lg cursor-pointer transition-colors border border-transparent",
                  isActive
                    ? "bg-amber-500/10 border-amber-500/20 text-foreground"
                    : "text-foreground hover:bg-accent",
                )}
                onClick={() => navigateToNote(note.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, noteId: note.id });
                }}
              >
                <span className="text-[0.8125rem] font-medium truncate leading-tight">
                  {note.label}
                </span>
                <span className="flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
                  <span>{note.folder_name}</span>
                  <span>&middot;</span>
                  <span>{formatTime(note.updated_at)}</span>
                </span>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {note.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-px text-[0.625rem] rounded bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {note.tags.length > 3 && (
                      <span className="px-1.5 py-px text-[0.625rem] rounded bg-muted text-muted-foreground">
                        +{note.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Sidebar context menu for notes */}
      {contextMenu && (
        <div
          className="fixed z-[100] min-w-[180px] p-1 bg-card/95 backdrop-blur-2xl saturate-150 border border-border rounded-lg shadow-lg"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-foreground rounded-md cursor-pointer transition-colors hover:bg-accent [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground"
            onClick={() => {
              navigateToNote(contextMenu.noteId);
              setContextMenu(null);
            }}
          >
            <NotebookPen /> Open Note
          </button>
          <button
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-foreground rounded-md cursor-pointer transition-colors hover:bg-accent [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground"
            onClick={async () => {
              const { data: userData } = await (await import("@/utils/supabase/client")).supabase.auth.getUser();
              if (!userData?.user?.id) return;
              const note = notes.find((n) => n.id === contextMenu.noteId);
              if (!note) return;
              navigateToNote(contextMenu.noteId);
              setContextMenu(null);
            }}
          >
            <Copy /> Duplicate
          </button>
          <button
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-foreground rounded-md cursor-pointer transition-colors hover:bg-accent [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground"
            onClick={() => {
              const note = notes.find((n) => n.id === contextMenu.noteId);
              if (!note) return;
              navigateToNote(contextMenu.noteId);
              setContextMenu(null);
            }}
          >
            <Download /> Export
          </button>
          <div className="h-px my-1 mx-1.5 bg-border" />
          <button
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-destructive rounded-md cursor-pointer transition-colors hover:bg-destructive/10 [&_svg]:w-3.5 [&_svg]:h-3.5"
            onClick={async () => {
              const { supabase: sb } = await import("@/utils/supabase/client");
              await sb.from("notes").update({ is_deleted: true }).eq("id", contextMenu.noteId);
              setContextMenu(null);
              window.location.reload();
            }}
          >
            <Trash2 /> Delete Note
          </button>
        </div>
      )}
    </>
  );
}
