"use client";

// SidebarClient — Client island for the notes sidebar.
// Receives server-fetched note list as props. Handles search, folder filtering,
// and sort — all via URL searchParams for bookmarkable, shareable state.

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import {
  Search,
  FileText,
  Edit3,
  User,
  Briefcase,
  Lightbulb,
  Folder,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { NoteSummary } from "../layout";
import NewNoteButton from "./NewNoteButton";

// Folder icon mapping (matches defaultFolders.ts without importing Lucide dynamically)
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

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

  // Build URL with updated params
  const buildUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      // Preserve the current note path if on a note, otherwise go to /ssr/notes
      return `${pathname}${qs ? `?${qs}` : ""}`;
    },
    [pathname, searchParams],
  );

  // Navigate with transition (no outer re-renders)
  const navigateWithParams = useCallback(
    (updates: Record<string, string | null>) => {
      startTransition(() => {
        router.replace(buildUrl(updates), { scroll: false });
      });
    },
    [router, buildUrl],
  );

  // Navigate to a note — also manages the tabs URL param
  const navigateToNote = useCallback(
    (noteId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      // Add to tabs if not already there
      const currentTabs = params.get("tabs")?.split(",").filter(Boolean) ?? [];
      if (!currentTabs.includes(noteId)) {
        currentTabs.push(noteId);
        params.set("tabs", currentTabs.join(","));
      }
      const qs = params.toString();
      startTransition(() => {
        router.push(`/ssr/notes/${noteId}${qs ? `?${qs}` : ""}`);
      });
    },
    [router, searchParams],
  );

  // Filter + sort notes
  const filteredNotes = useMemo(() => {
    let result = notes;

    // Folder filter
    if (activeFolder) {
      result = result.filter((n) => n.folder_name === activeFolder);
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Tag filter
    if (activeTags.length > 0) {
      result = result.filter((n) =>
        activeTags.every((t) => n.tags.includes(t)),
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortField === "label") {
        const cmp = a.label.localeCompare(b.label);
        return sortOrder === "asc" ? cmp : -cmp;
      }
      // Default: updated_at
      const cmp = a.updated_at.localeCompare(b.updated_at);
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [notes, activeFolder, searchQuery, activeTags, sortField, sortOrder]);

  // Ordered folders: defaults first, then custom alphabetically
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
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // Toggle sort direction
  const toggleSort = () => {
    navigateWithParams({ order: sortOrder === "desc" ? "asc" : "desc" });
  };

  return (
    <>
      {/* Search + New Note */}
      <div className="notes-sidebar-header">
        <div className="notes-search">
          <Search className="notes-search-icon" />
          <input
            className="notes-search-input"
            type="text"
            placeholder="Search notes..."
            defaultValue={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              navigateWithParams({ q: val || null });
            }}
            aria-label="Search notes"
          />
        </div>
        <button
          className="notes-sort-btn"
          onClick={toggleSort}
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
          onClick={() => navigateWithParams({ folder: null })}
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
                navigateWithParams({
                  folder: activeFolder === folder ? null : folder,
                })
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
      <div className="notes-list">
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
    </>
  );
}
