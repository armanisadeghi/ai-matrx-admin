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
  FolderPlus,
  MoreHorizontal,
  NotebookPen,
  Trash2,
  Copy,
  Download,
  FolderInput,
} from "lucide-react";
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
      // Keep current path, just update params
      const url = `${pathname}${qs ? `?${qs}` : ""}`;
      window.history.replaceState({}, "", url);
    },
    [pathname, searchParams],
  );

  const navigateToNote = useCallback(
    (noteId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      // Add to tabs if not already there
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
      <div className="notes-sidebar-header">
        <div className="notes-search">
          <Search className="notes-search-icon" />
          <input
            className="notes-search-input"
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
          className="notes-sort-btn"
          onClick={() => updateParams({ order: sortOrder === "desc" ? "asc" : "desc" })}
          data-active={sortOrder === "asc" ? "true" : undefined}
          title={`Sort ${sortOrder === "desc" ? "oldest first" : "newest first"}`}
          aria-label="Toggle sort order"
        >
          {sortOrder === "desc" ? <ChevronDown /> : <ChevronUp />}
        </button>
        <NewNoteButton />
      </div>

      {/* Folder chips */}
      <div className="notes-folders">
        <button
          className="notes-folder-chip"
          data-active={!activeFolder ? "true" : undefined}
          onClick={() => updateParams({ folder: null })}
        >
          All
          <span className="notes-folder-count">{notes.length}</span>
        </button>
        {orderedFolders.map((folder) => {
          const Icon = FOLDER_ICONS[folder] ?? Folder;
          return (
            <button
              key={folder}
              className="notes-folder-chip"
              data-active={activeFolder === folder ? "true" : undefined}
              onClick={() =>
                updateParams({ folder: activeFolder === folder ? null : folder })
              }
            >
              <Icon />
              {folder}
              <span className="notes-folder-count">{folderCounts[folder]}</span>
            </button>
          );
        })}
      </div>

      <div className="notes-sidebar-divider" />

      {/* Note list */}
      <div className="notes-list" onClick={contextMenu ? closeContextMenu : undefined}>
        {filteredNotes.length === 0 ? (
          <div className="notes-list-empty">
            <FileText />
            <span>
              {searchQuery
                ? "No notes match your search"
                : activeFolder
                  ? `No notes in ${activeFolder}`
                  : "No notes yet"}
            </span>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <button
              key={note.id}
              className="notes-list-item"
              data-active={activeNoteId === note.id ? "true" : undefined}
              onClick={() => navigateToNote(note.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, noteId: note.id });
              }}
              style={{ width: "100%", textAlign: "left" }}
            >
              <span className="notes-list-item-title">{note.label}</span>
              <span className="notes-list-item-meta">
                <span>{note.folder_name}</span>
                <span>&middot;</span>
                <span>{formatTime(note.updated_at)}</span>
              </span>
              {note.tags.length > 0 && (
                <div className="notes-list-item-tags">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="notes-list-item-tag">
                      {tag}
                    </span>
                  ))}
                  {note.tags.length > 3 && (
                    <span className="notes-list-item-tag">+{note.tags.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Sidebar context menu for notes */}
      {contextMenu && (
        <div
          className="notes-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="notes-context-item"
            onClick={() => {
              navigateToNote(contextMenu.noteId);
              setContextMenu(null);
            }}
          >
            <NotebookPen /> Open Note
          </button>
          <button
            className="notes-context-item"
            onClick={async () => {
              const { data: userData } = await (await import("@/utils/supabase/client")).supabase.auth.getUser();
              if (!userData?.user?.id) return;
              const note = notes.find((n) => n.id === contextMenu.noteId);
              if (!note) return;
              // Duplicate via workspace will handle this
              navigateToNote(contextMenu.noteId);
              setContextMenu(null);
            }}
          >
            <Copy /> Duplicate
          </button>
          <button
            className="notes-context-item"
            onClick={() => {
              // Export as markdown
              const note = notes.find((n) => n.id === contextMenu.noteId);
              if (!note) return;
              // Note: sidebar only has metadata, full export is done from workspace
              navigateToNote(contextMenu.noteId);
              setContextMenu(null);
            }}
          >
            <Download /> Export
          </button>
          <div className="notes-context-divider" />
          <button
            className="notes-context-item notes-context-item-danger"
            onClick={async () => {
              const { supabase: sb } = await import("@/utils/supabase/client");
              await sb.from("notes").update({ is_deleted: true }).eq("id", contextMenu.noteId);
              setContextMenu(null);
              // Note: sidebar data is stale until layout refreshes
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
