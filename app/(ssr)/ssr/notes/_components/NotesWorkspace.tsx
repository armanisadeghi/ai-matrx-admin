"use client";

// NotesWorkspace — Persistent client component that lives in the layout.
// NEVER unmounts when switching between notes. Manages:
// - Note content cache (Map<id, NoteData>) — instant tab switching
// - Tab state via URL searchParams
// - Active note from URL pathname
// - Background refresh with diff detection
// - Auto-save with conflict detection
// - Editor modes (plain, markdown preview via MarkdownStream)
// - Compact VSCode-style tab row with inline action icons
// - View mode buttons portaled into shell header center
// - State sync with sidebar via custom events
// - Lazy-loaded AI integrations context menu

import { usePathname, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { createPortal } from "react-dom";
import PageHeader from "@/features/ssr-trials/components/PageHeader";
import {
  X,
  NotebookPen,
  Save,
  ChevronLeft,
  Folder,
  Copy,
  Trash2,
  FileText,
  Eye,
  SplitSquareHorizontal,
  FolderInput,
  MoreHorizontal,
  Plus,
  Share2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { supabase } from "@/utils/supabase/client";
import { MicrophoneIconButton } from "@/features/audio/components/MicrophoneIconButton";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/slices/userSlice";
import type { NoteSummary } from "../layout";
import type { MarkdownStreamProps } from "@/components/MarkdownStream";
import { MatrxSplit } from "@/components/matrx/MatrxSplit";

const MarkdownStream = dynamic<MarkdownStreamProps>(
  () => import("@/components/MarkdownStream"),
  {
    ssr: false,
    loading: () => (
      <div className="notes-preview-empty">Loading preview...</div>
    ),
  },
);

const NoteShareDialog = dynamic(() => import("./NoteShareDialog"), {
  ssr: false,
  loading: () => null,
});

import NoteContextMenu from "./NoteContextMenu";

const NoteOptionsSheet = dynamic(() => import("./NoteOptionsSheet"), {
  ssr: false,
  loading: () => null,
});

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NoteData {
  id: string;
  label: string;
  content: string;
  folder_name: string;
  tags: string[];
  metadata: Record<string, unknown>;
  updated_at: string;
}

type SaveState = "saved" | "dirty" | "saving" | "conflict";
type EditorMode = "plain" | "preview" | "split";

interface CachedNote {
  data: NoteData;
  localEdits: { label: string; content: string } | null;
  saveState: SaveState;
  fetchedAt: number;
}

const DEFAULT_FOLDERS = ["Draft", "Personal", "Business", "Prompts", "Scratch"];

// ─── Portaled folder dropdown ────────────────────────────────────────────────

function FolderDropdown({
  triggerRef,
  folders,
  currentFolder,
  onSelect,
  onClose,
  anchor = "below",
}: {
  triggerRef: React.RefObject<HTMLElement | null>;
  folders: string[];
  currentFolder: string | undefined;
  onSelect: (folder: string) => void;
  onClose: () => void;
  anchor?: "below" | "above";
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (anchor === "above") {
      setPos({ top: rect.top, left: rect.left });
    } else {
      setPos({ top: rect.bottom + 4, left: rect.right - 160 });
    }
  }, [triggerRef, anchor]);

  if (!pos) return null;

  const style: React.CSSProperties =
    anchor === "above"
      ? {
          position: "fixed",
          bottom: window.innerHeight - pos.top + 4,
          left: pos.left,
          zIndex: 9999,
        }
      : {
          position: "fixed",
          top: pos.top,
          left: Math.max(8, pos.left),
          zIndex: 9999,
        };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        className="min-w-[160px] p-1 bg-card/95 backdrop-blur-2xl saturate-150 border border-border rounded-lg shadow-lg"
        style={style}
      >
        {folders.map((f) => {
          const isCurrent = currentFolder === f;
          return (
            <button
              key={f}
              className={cn(
                "flex items-center gap-2 w-full px-2.5 py-1 text-xs rounded-md cursor-pointer transition-colors [&_svg]:w-3.5 [&_svg]:h-3.5",
                isCurrent
                  ? "text-amber-600 dark:text-amber-400 bg-amber-500/5"
                  : "text-foreground hover:bg-accent",
              )}
              onClick={() => onSelect(f)}
              disabled={isCurrent}
            >
              <FolderInput />
              {f}
              {isCurrent && (
                <span className="ml-auto text-[0.625rem] opacity-50">
                  current
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>,
    document.body,
  );
}

// ─── Auto-label generation ──────────────────────────────────────────────────

function generateLabelFromContent(content: string, maxLength = 30): string {
  if (!content || content.trim() === "") return "";
  const lines = content.split("\n");
  let firstLine = lines[0].trim();
  if (!firstLine && lines.length > 1) {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        firstLine = lines[i].trim();
        break;
      }
    }
  }
  if (!firstLine) return "";
  firstLine = firstLine
    .replace(/\s+/g, " ")
    .replace(/^[#\-*>\s]+/, "")
    .trim();
  if (firstLine.length > 0) {
    firstLine = firstLine.charAt(0).toUpperCase() + firstLine.slice(1);
  }
  if (firstLine.length > maxLength) {
    const truncated = firstLine.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    return lastSpace > maxLength * 0.7
      ? truncated.substring(0, lastSpace) + "..."
      : truncated + "...";
  }
  return firstLine;
}

// ─── URL Utilities ──────────────────────────────────────────────────────────

function extractNoteId(pathname: string): string {
  if (!pathname.startsWith("/ssr/notes/")) return "";
  return pathname.split("/ssr/notes/")[1]?.split("/")[0]?.split("?")[0] ?? "";
}

function buildNotesUrl(noteId: string | null, params: URLSearchParams): string {
  const base = noteId ? `/ssr/notes/${noteId}` : "/ssr/notes";
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface NotesWorkspaceProps {
  notes?: NoteSummary[];
}

// Module evaluated = NotesWorkspace bundle parsed. Large gap to mount = hydration cost.
console.debug(
  `⚡NotesWorkspace module evaluated at ${performance.now().toFixed(2)}ms`,
);

export default function NotesWorkspace({
  notes: initialNotes = [],
}: NotesWorkspaceProps) {
  const [notes, setNotes] = useState<NoteSummary[]>(initialNotes);
  const { id: userId } = useAppSelector(selectUser);

  useEffect(() => {
    console.debug(
      `⚡NotesWorkspace mounted at ${performance.now().toFixed(2)}ms`,
    );
  }, []);

  // Fetch notes after mount — use userId from Redux (set by DeferredShellData), no redundant getUser() call
  useEffect(() => {
    if (!userId) return;
    const t0 = performance.now();
    supabase
      .from("notes")
      .select("id, label, folder_name, tags, updated_at, position")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        console.debug(
          `⚡NotesWorkspace notes fetched in ${(performance.now() - t0).toFixed(2)}ms`,
        );
        if (!data) return;
        setNotes(
          data.map((n) => ({
            id: n.id,
            label: n.label ?? "Untitled",
            folder_name: n.folder_name ?? "Draft",
            tags: n.tags ?? [],
            updated_at: n.updated_at ?? "",
            position: n.position ?? 0,
          })),
        );
      });
  }, [userId]);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Derived URL state ───────────────────────────────────────────────────
  const activeNoteId = extractNoteId(pathname);
  const tabIds = useMemo(
    () => searchParams.get("tabs")?.split(",").filter(Boolean) ?? [],
    [searchParams],
  );

  // ── Core state ──────────────────────────────────────────────────────────
  const [noteCache, setNoteCache] = useState<Map<string, CachedNote>>(
    () => new Map(),
  );
  const [editorMode, setEditorMode] = useState<EditorMode>("plain");
  const [showNoteOptions, setShowNoteOptions] = useState(false);

  // Portal root for overlays that need to escape the notes z-index stacking context
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  const saveTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const labelMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const n of notes) m[n.id] = n.label;
    return m;
  }, [notes]);

  // All folders: defaults + any custom folders from user's notes
  const allFolders = useMemo(() => {
    const folderSet = new Set(DEFAULT_FOLDERS);
    for (const n of notes) {
      if (n.folder_name) folderSet.add(n.folder_name);
    }
    // Also include folders from cached notes
    for (const [, cached] of noteCache) {
      if (cached.data.folder_name) folderSet.add(cached.data.folder_name);
    }
    const defaults = DEFAULT_FOLDERS.filter((f) => folderSet.has(f));
    const custom = [...folderSet]
      .filter((f) => !DEFAULT_FOLDERS.includes(f))
      .sort();
    return [...defaults, ...custom];
  }, [notes, noteCache]);

  // ── Fetch note content ──────────────────────────────────────────────────

  const fetchNote = useCallback(async (noteId: string) => {
    const { data, error } = await supabase
      .from("notes")
      .select("id, label, content, folder_name, tags, metadata, updated_at")
      .eq("id", noteId)
      .eq("is_deleted", false)
      .single();

    if (error || !data) return null;

    const noteData: NoteData = {
      id: data.id,
      label: data.label ?? "Untitled",
      content: data.content ?? "",
      folder_name: data.folder_name ?? "Draft",
      tags: (data.tags as string[]) ?? [],
      metadata: (data.metadata as Record<string, unknown>) ?? {},
      updated_at: data.updated_at ?? "",
    };

    setNoteCache((prev) => {
      const next = new Map(prev);
      const existing = next.get(noteId);

      // If we have local edits, don't overwrite — detect conflict instead
      if (existing?.localEdits) {
        const serverChanged =
          noteData.content !== existing.data.content ||
          noteData.label !== existing.data.label;
        if (serverChanged) {
          next.set(noteId, {
            ...existing,
            data: noteData,
            saveState: "conflict",
            fetchedAt: Date.now(),
          });
          return next;
        }
        // Server matches what we had — no conflict
        next.set(noteId, {
          ...existing,
          data: noteData,
          fetchedAt: Date.now(),
        });
        return next;
      }

      // No local edits — just update cache
      next.set(noteId, {
        data: noteData,
        localEdits: null,
        saveState: "saved",
        fetchedAt: Date.now(),
      });
      return next;
    });

    return noteData;
  }, []);

  // ── Fetch on first open + background refresh ──────────────────────────

  useEffect(() => {
    if (!activeNoteId) return;

    const cached = noteCache.get(activeNoteId);
    if (!cached) {
      // First time opening — fetch
      fetchNote(activeNoteId);
    } else {
      // Already cached — background refresh if stale (>30s)
      const age = Date.now() - cached.fetchedAt;
      if (age > 30_000) {
        fetchNote(activeNoteId);
      }
    }
  }, [activeNoteId, fetchNote]); // intentionally NOT including noteCache to avoid loop

  // ── URL management via pushState ──────────────────────────────────────

  const updateUrl = useCallback(
    (noteId: string | null, paramUpdates?: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (paramUpdates) {
        for (const [k, v] of Object.entries(paramUpdates)) {
          if (v === null) params.delete(k);
          else params.set(k, v);
        }
      }
      const url = buildNotesUrl(noteId, params);
      window.history.pushState({}, "", url);
    },
    [searchParams],
  );

  // ── Tab management ──────────────────────────────────────────────────────

  const switchTab = useCallback(
    (noteId: string) => {
      if (noteId === activeNoteId) return;
      const params = new URLSearchParams(searchParams.toString());
      // Add to tabs if missing
      const tabs = params.get("tabs")?.split(",").filter(Boolean) ?? [];
      if (!tabs.includes(noteId)) {
        tabs.push(noteId);
        params.set("tabs", tabs.join(","));
      }
      window.history.pushState({}, "", buildNotesUrl(noteId, params));
    },
    [activeNoteId, searchParams],
  );

  const closeTab = useCallback(
    (noteId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const tabs = params.get("tabs")?.split(",").filter(Boolean) ?? [];
      const newTabs = tabs.filter((id) => id !== noteId);

      if (newTabs.length > 0) {
        params.set("tabs", newTabs.join(","));
      } else {
        params.delete("tabs");
      }

      // If closing active tab, switch to adjacent
      let nextNoteId: string | null = null;
      if (noteId === activeNoteId) {
        const idx = tabs.indexOf(noteId);
        nextNoteId = newTabs[idx] ?? newTabs[idx - 1] ?? null;
      } else {
        nextNoteId = activeNoteId || null;
      }

      window.history.pushState({}, "", buildNotesUrl(nextNoteId, params));
    },
    [activeNoteId, searchParams],
  );

  const closeOtherTabs = useCallback(
    (keepId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tabs", keepId);
      window.history.pushState({}, "", buildNotesUrl(keepId, params));
    },
    [searchParams],
  );

  const closeAllTabs = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tabs");
    window.history.pushState({}, "", buildNotesUrl(null, params));
  }, [searchParams]);

  // ── Auto-save with sidebar sync ──────────────────────────────────────

  const scheduleSave = useCallback(
    (noteId: string, label: string, content: string) => {
      // Clear existing timer
      const timers = saveTimerRef.current;
      const existing = timers.get(noteId);
      if (existing) clearTimeout(existing);

      // Mark dirty
      setNoteCache((prev) => {
        const next = new Map(prev);
        const cached = next.get(noteId);
        if (!cached) return prev;
        next.set(noteId, {
          ...cached,
          localEdits: { label, content },
          saveState: "dirty",
        });
        return next;
      });

      // Schedule save
      const timer = setTimeout(async () => {
        timers.delete(noteId);

        setNoteCache((prev) => {
          const next = new Map(prev);
          const cached = next.get(noteId);
          if (!cached) return prev;
          next.set(noteId, { ...cached, saveState: "saving" });
          return next;
        });

        try {
          const updates: Record<string, string> = {};
          const cached = noteCache.get(noteId);
          if (!cached) return;

          if (label !== cached.data.label) updates.label = label;
          if (content !== cached.data.content) updates.content = content;

          if (Object.keys(updates).length === 0) {
            setNoteCache((prev) => {
              const next = new Map(prev);
              const c = next.get(noteId);
              if (!c) return prev;
              const editsStillMatch =
                c.localEdits?.content === content &&
                c.localEdits?.label === label;
              next.set(noteId, {
                ...c,
                localEdits: editsStillMatch ? null : c.localEdits,
                saveState: editsStillMatch ? "saved" : c.saveState,
              });
              return next;
            });
            return;
          }

          const { data, error } = await supabase
            .from("notes")
            .update(updates)
            .eq("id", noteId)
            .select("updated_at")
            .single();

          if (error) {
            console.error("Auto-save failed:", error);
            setNoteCache((prev) => {
              const next = new Map(prev);
              const c = next.get(noteId);
              if (!c) return prev;
              next.set(noteId, { ...c, saveState: "dirty" });
              return next;
            });
            return;
          }

          if (updates.label) {
            window.dispatchEvent(
              new CustomEvent("notes:labelChange", {
                detail: { noteId, label: updates.label },
              }),
            );
          }

          setNoteCache((prev) => {
            const next = new Map(prev);
            const c = next.get(noteId);
            if (!c) return prev;
            // Only clear localEdits if the user hasn't typed more since the save started.
            // If localEdits have changed, a new save is already scheduled — preserve them.
            const editsStillMatch =
              c.localEdits?.content === content &&
              c.localEdits?.label === label;
            next.set(noteId, {
              data: {
                ...c.data,
                ...updates,
                updated_at: data?.updated_at ?? c.data.updated_at,
              },
              localEdits: editsStillMatch ? null : c.localEdits,
              saveState: editsStillMatch ? "saved" : c.saveState,
              fetchedAt: Date.now(),
            });
            return next;
          });
        } catch {
          setNoteCache((prev) => {
            const next = new Map(prev);
            const c = next.get(noteId);
            if (!c) return prev;
            next.set(noteId, { ...c, saveState: "dirty" });
            return next;
          });
        }
      }, 1500);

      timers.set(noteId, timer);
    },
    [noteCache],
  );

  // ── Force save ──────────────────────────────────────────────────────────

  const forceSave = useCallback(
    async (noteId: string) => {
      const cached = noteCache.get(noteId);
      if (!cached?.localEdits) return;

      const timers = saveTimerRef.current;
      const t = timers.get(noteId);
      if (t) {
        clearTimeout(t);
        timers.delete(noteId);
      }

      setNoteCache((prev) => {
        const next = new Map(prev);
        const c = next.get(noteId);
        if (!c) return prev;
        next.set(noteId, { ...c, saveState: "saving" });
        return next;
      });

      const { label, content } = cached.localEdits;
      const { data, error } = await supabase
        .from("notes")
        .update({ label, content })
        .eq("id", noteId)
        .select("updated_at")
        .single();

      if (error) {
        setNoteCache((prev) => {
          const next = new Map(prev);
          const c = next.get(noteId);
          if (!c) return prev;
          next.set(noteId, { ...c, saveState: "dirty" });
          return next;
        });
        return;
      }

      if (label !== cached.data.label) {
        window.dispatchEvent(
          new CustomEvent("notes:labelChange", {
            detail: { noteId, label },
          }),
        );
      }

      setNoteCache((prev) => {
        const next = new Map(prev);
        const c = next.get(noteId);
        if (!c) return prev;
        const editsStillMatch =
          c.localEdits?.content === content && c.localEdits?.label === label;
        next.set(noteId, {
          data: {
            ...c.data,
            label,
            content,
            updated_at: data?.updated_at ?? c.data.updated_at,
          },
          localEdits: editsStillMatch ? null : c.localEdits,
          saveState: editsStillMatch ? "saved" : c.saveState,
          fetchedAt: Date.now(),
        });
        return next;
      });
    },
    [noteCache],
  );

  // ── Note CRUD ─────────────────────────────────────────────────────────

  const deleteNote = useCallback(
    async (noteId: string) => {
      await supabase
        .from("notes")
        .update({ is_deleted: true })
        .eq("id", noteId);

      // Remove from cache
      setNoteCache((prev) => {
        const next = new Map(prev);
        next.delete(noteId);
        return next;
      });

      // Notify sidebar
      window.dispatchEvent(
        new CustomEvent("notes:deleted", { detail: { noteId } }),
      );

      closeTab(noteId);
    },
    [closeTab],
  );

  const duplicateNote = useCallback(
    async (noteId: string) => {
      const cached = noteCache.get(noteId);
      if (!cached || !userId) return;

      const n = cached.localEdits
        ? { ...cached.data, ...cached.localEdits }
        : cached.data;

      const { data: newNote, error } = await supabase
        .from("notes")
        .insert({
          user_id: userId,
          label: `${n.label} (Copy)`,
          content: n.content,
          folder_name: n.folder_name,
          tags: n.tags,
          metadata: n.metadata,
          position: 0,
        })
        .select("id, label, folder_name, tags, updated_at, position")
        .single();

      if (error || !newNote) return;

      // Notify sidebar about new note
      window.dispatchEvent(
        new CustomEvent("notes:created", {
          detail: {
            id: newNote.id,
            label: newNote.label ?? `${n.label} (Copy)`,
            folder_name: newNote.folder_name ?? n.folder_name,
            tags: (newNote.tags as string[]) ?? n.tags,
            updated_at: newNote.updated_at ?? new Date().toISOString(),
            position: newNote.position ?? 0,
          } satisfies NoteSummary,
        }),
      );

      switchTab(newNote.id);
    },
    [noteCache, userId, switchTab],
  );

  const exportNote = useCallback(
    (noteId: string) => {
      const cached = noteCache.get(noteId);
      if (!cached) return;

      const n = cached.localEdits
        ? { ...cached.data, ...cached.localEdits }
        : cached.data;
      const blob = new Blob([`# ${n.label}\n\n${n.content}`], {
        type: "text/markdown",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${n.label.replace(/[^a-zA-Z0-9-_ ]/g, "")}.md`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [noteCache],
  );

  const shareNote = useCallback(
    async (noteId: string) => {
      const cached = noteCache.get(noteId);
      if (!cached) return;
      const n = cached.localEdits
        ? { ...cached.data, ...cached.localEdits }
        : cached.data;

      try {
        await navigator.clipboard.writeText(`# ${n.label}\n\n${n.content}`);
      } catch {
        // Fallback — just copy the URL
        await navigator.clipboard.writeText(window.location.href);
      }
    },
    [noteCache],
  );

  const createNoteInActiveFolder = useCallback(async () => {
    if (!userId) return;

    const folder =
      (activeNoteId ? noteCache.get(activeNoteId)?.data.folder_name : null) ??
      "Draft";

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

    switchTab(note.id);
  }, [activeNoteId, noteCache, userId, switchTab]);

  const moveNote = useCallback(async (noteId: string, folder: string) => {
    await supabase
      .from("notes")
      .update({ folder_name: folder })
      .eq("id", noteId);

    setNoteCache((prev) => {
      const next = new Map(prev);
      const cached = next.get(noteId);
      if (!cached) return prev;
      next.set(noteId, {
        ...cached,
        data: { ...cached.data, folder_name: folder },
      });
      return next;
    });

    window.dispatchEvent(
      new CustomEvent("notes:moved", { detail: { noteId, folder } }),
    );
  }, []);

  // ── AI result handler ────────────────────────────────────────────────

  // Ref to the active textarea — passed to NoteContextMenu for clipboard + find/replace
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-label tracking — prevents re-generating after user edits title
  const autoLabeledRef = useRef<Set<string>>(new Set());

  // Refs for folder dropdown trigger buttons (portaled to escape overflow clipping)
  const tabFolderBtnRef = useRef<HTMLButtonElement | null>(null);
  const bottomFolderBtnRef = useRef<HTMLButtonElement | null>(null);

  // Share dialog state
  const [shareDialogNoteId, setShareDialogNoteId] = useState<string | null>(
    null,
  );

  // Tag editing state (per-note, pushed deep)
  const [editingTags, setEditingTags] = useState(false);
  const [tagInputValue, setTagInputValue] = useState("");

  // Folder selector state
  const [showFolderSelect, setShowFolderSelect] = useState(false);
  const [showTabFolderDrop, setShowTabFolderDrop] = useState<string | null>(
    null,
  );

  // ── Tag management ────────────────────────────────────────────────────

  const updateTags = useCallback(async (noteId: string, newTags: string[]) => {
    await supabase.from("notes").update({ tags: newTags }).eq("id", noteId);

    setNoteCache((prev) => {
      const next = new Map(prev);
      const cached = next.get(noteId);
      if (!cached) return prev;
      next.set(noteId, {
        ...cached,
        data: { ...cached.data, tags: newTags },
      });
      return next;
    });
  }, []);

  const addTag = useCallback(
    (noteId: string, tag: string) => {
      const cached = noteCache.get(noteId);
      if (!cached) return;
      const current = cached.data.tags;
      if (current.includes(tag)) return;
      updateTags(noteId, [...current, tag]);
    },
    [noteCache, updateTags],
  );

  const removeTag = useCallback(
    (noteId: string, tag: string) => {
      const cached = noteCache.get(noteId);
      if (!cached) return;
      updateTags(
        noteId,
        cached.data.tags.filter((t) => t !== tag),
      );
    },
    [noteCache, updateTags],
  );

  // ── Resolve conflict ──────────────────────────────────────────────────

  const resolveConflict = useCallback(
    (noteId: string, choice: "local" | "server") => {
      setNoteCache((prev) => {
        const next = new Map(prev);
        const cached = next.get(noteId);
        if (!cached) return prev;

        if (choice === "server") {
          // Discard local edits, use server data
          next.set(noteId, {
            ...cached,
            localEdits: null,
            saveState: "saved",
          });
        } else {
          // Keep local edits, save them
          next.set(noteId, { ...cached, saveState: "dirty" });
          if (cached.localEdits) {
            scheduleSave(
              noteId,
              cached.localEdits.label,
              cached.localEdits.content,
            );
          }
        }
        return next;
      });
    },
    [scheduleSave],
  );

  // ── Keyboard shortcuts ──────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Ctrl+W — close active tab
      if (mod && e.key === "w" && activeNoteId) {
        e.preventDefault();
        closeTab(activeNoteId);
      }

      // Ctrl+Tab — cycle tabs
      if (e.ctrlKey && e.key === "Tab" && tabIds.length > 1) {
        e.preventDefault();
        const idx = tabIds.indexOf(activeNoteId);
        const nextIdx = e.shiftKey
          ? (idx - 1 + tabIds.length) % tabIds.length
          : (idx + 1) % tabIds.length;
        switchTab(tabIds[nextIdx]);
      }

      // Ctrl+S — force save
      if (mod && e.key === "s" && activeNoteId) {
        e.preventDefault();
        forceSave(activeNoteId);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeNoteId, tabIds, closeTab, switchTab, forceSave]);

  // ── Cleanup save timers ───────────────────────────────────────────────

  useEffect(() => {
    return () => {
      const timers = saveTimerRef.current;
      for (const t of timers.values()) clearTimeout(t);
    };
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────

  const activeCached = activeNoteId ? noteCache.get(activeNoteId) : null;
  const activeLabel =
    activeCached?.localEdits?.label ?? activeCached?.data.label ?? "";
  const activeContent =
    activeCached?.localEdits?.content ?? activeCached?.data.content ?? "";
  const visibleTabs = tabIds.filter((id) => labelMap[id] || noteCache.has(id));

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!activeNoteId) return;
    scheduleSave(activeNoteId, e.target.value, activeContent);
  };

  const handleContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeNoteId) return;
    const newContent = e.target.value;
    let label = activeLabel;

    // Auto-label: generate title from content if label is "New Note" or "Untitled"
    const isDefaultLabel =
      !label ||
      label.toLowerCase() === "new note" ||
      label.toLowerCase() === "untitled";
    if (isDefaultLabel && !autoLabeledRef.current.has(activeNoteId)) {
      const trimmed = newContent.trim();
      const hasNewline = newContent.includes("\n");
      const hasMinLength = trimmed.length >= 12;
      if (trimmed && (hasNewline || hasMinLength)) {
        const generated = generateLabelFromContent(newContent);
        if (generated && generated !== label) {
          label = generated;
          autoLabeledRef.current.add(activeNoteId);
        }
      }
    }

    scheduleSave(activeNoteId, label, newContent);
  };

  const handleTranscription = useCallback(
    (text: string) => {
      if (!text.trim() || !activeNoteId) return;
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const current = textarea.value;
        const before = current.slice(0, start);
        const after = current.slice(end);
        const sep =
          before.length > 0 && !before.endsWith("\n") && !before.endsWith(" ")
            ? " "
            : "";
        const newContent = before + sep + text + after;
        handleContentChange({
          target: { value: newContent },
        } as ChangeEvent<HTMLTextAreaElement>);
        requestAnimationFrame(() => {
          const newPos = start + sep.length + text.length;
          textarea.selectionStart = newPos;
          textarea.selectionEnd = newPos;
          textarea.focus();
        });
      } else {
        const current =
          activeCached?.localEdits?.content ?? activeCached?.data.content ?? "";
        const sep = current.length > 0 ? "\n\n" : "";
        handleContentChange({
          target: { value: current + sep + text },
        } as ChangeEvent<HTMLTextAreaElement>);
      }
    },
    [activeNoteId, activeCached],
  );

  const goBack = () => updateUrl(null);

  // Word/char count
  const wordCount = activeContent.trim()
    ? activeContent.trim().split(/\s+/).length
    : 0;

  const saveState = activeCached?.saveState ?? "saved";
  const statusLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "dirty"
        ? "Unsaved"
        : saveState === "conflict"
          ? "Conflict"
          : "Saved";

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
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // Small icon button for the tab row action bar
  const actionBtnClass =
    "flex items-center justify-center w-6 h-6 rounded cursor-pointer transition-colors text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:w-3.5 [&_svg]:h-3.5";

  // ─── RENDER ─────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Header center: View mode buttons via PageHeader ────────── */}
      {activeNoteId && activeCached && (
        <PageHeader>
          <div className="shell-glass flex items-center gap-0.5 rounded-full p-0.5">
            <button
              className={cn(
                "flex items-center gap-1 px-2.5 py-0.5 text-[0.6875rem] font-medium rounded-full transition-colors cursor-pointer",
                "[&_svg]:w-3.5 [&_svg]:h-3.5",
                editorMode === "plain"
                  ? "bg-[var(--shell-glass-bg-active)] text-[var(--shell-nav-text-hover)]"
                  : "text-[var(--shell-nav-text)] hover:text-[var(--shell-nav-text-hover)]",
              )}
              onClick={() => setEditorMode("plain")}
            >
              <FileText /> Edit
            </button>
            <button
              className={cn(
                "flex items-center gap-1 px-2.5 py-0.5 text-[0.6875rem] font-medium rounded-full transition-colors cursor-pointer",
                "[&_svg]:w-3.5 [&_svg]:h-3.5",
                "max-lg:hidden",
                editorMode === "split"
                  ? "bg-[var(--shell-glass-bg-active)] text-[var(--shell-nav-text-hover)]"
                  : "text-[var(--shell-nav-text)] hover:text-[var(--shell-nav-text-hover)]",
              )}
              onClick={() => setEditorMode("split")}
            >
              <SplitSquareHorizontal /> Split
            </button>
            <button
              className={cn(
                "flex items-center gap-1 px-2.5 py-0.5 text-[0.6875rem] font-medium rounded-full transition-colors cursor-pointer",
                "[&_svg]:w-3.5 [&_svg]:h-3.5",
                editorMode === "preview"
                  ? "bg-[var(--shell-glass-bg-active)] text-[var(--shell-nav-text-hover)]"
                  : "text-[var(--shell-nav-text)] hover:text-[var(--shell-nav-text-hover)]",
              )}
              onClick={() => setEditorMode("preview")}
            >
              <Eye /> Preview
            </button>
          </div>
        </PageHeader>
      )}

      {/* ── Compact Tab Row (VSCode-style) ─────────────────────────── */}
      {visibleTabs.length > 0 && (
        <div
          className="notes-tab-bar-scroll flex items-stretch h-8 min-h-[2rem] overflow-x-auto overflow-y-hidden border-b border-border shrink-0 lg:flex hidden mt-1"
          role="tablist"
          aria-label="Open notes"
        >
          {/* Tabs + new note button */}
          <div className="flex items-stretch flex-1 min-w-0 overflow-x-auto h-full">
            {visibleTabs.map((id) => {
              const cached = noteCache.get(id);
              const label =
                cached?.localEdits?.label ??
                cached?.data.label ??
                labelMap[id] ??
                "Untitled";
              const isDirty =
                cached?.saveState === "dirty" || cached?.saveState === "saving";
              const isActive = id === activeNoteId;

              return (
                <div
                  key={id}
                  className={cn(
                    "group flex items-center gap-0 px-[6px] text-[0.6875rem] font-medium whitespace-nowrap min-w-0 shrink-0 transition-colors",
                    isActive
                      ? "max-w-[340px] bg-accent/60 text-foreground"
                      : "max-w-[160px] bg-transparent text-muted-foreground hover:bg-accent/30 cursor-pointer",
                  )}
                  role="tab"
                  data-active={isActive ? "true" : undefined}
                  aria-selected={isActive}
                  onClick={() => !isActive && switchTab(id)}
                >
                  {isDirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  )}
                  {isActive ? (
                    <input
                      className="bg-transparent outline-none border-none min-w-0 w-full text-[0.6875rem] font-medium text-foreground truncate cursor-text"
                      value={label}
                      onChange={handleTitleChange}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Note title"
                      spellCheck={false}
                    />
                  ) : (
                    <span className="overflow-hidden text-ellipsis">
                      {label}
                    </span>
                  )}
                  {isActive && (
                    <div
                      className="flex items-center gap-px shrink-0 ml-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className={cn(
                          actionBtnClass,
                          saveState === "dirty" && "text-amber-500",
                        )}
                        onClick={() => forceSave(id)}
                        title="Save (Ctrl+S)"
                      >
                        <Save />
                      </button>
                      <button
                        className={actionBtnClass}
                        onClick={() => duplicateNote(id)}
                        title="Duplicate"
                      >
                        <Copy />
                      </button>
                      <button
                        className={actionBtnClass}
                        onClick={() => setShareDialogNoteId(id)}
                        title="Share note"
                      >
                        <Share2 />
                      </button>
                      <button
                        ref={
                          showTabFolderDrop === id ? tabFolderBtnRef : undefined
                        }
                        className={actionBtnClass}
                        onClick={() =>
                          setShowTabFolderDrop(
                            showTabFolderDrop === id ? null : id,
                          )
                        }
                        title="Move to folder"
                      >
                        <Folder />
                      </button>
                      {showTabFolderDrop === id && (
                        <FolderDropdown
                          triggerRef={tabFolderBtnRef}
                          folders={allFolders}
                          currentFolder={activeCached?.data.folder_name}
                          onSelect={(f) => {
                            moveNote(id, f);
                            setShowTabFolderDrop(null);
                          }}
                          onClose={() => setShowTabFolderDrop(null)}
                          anchor="below"
                        />
                      )}
                      <button
                        className={cn(actionBtnClass, "hover:text-destructive")}
                        onClick={() => deleteNote(id)}
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
                  <span
                    className="notes-tab-close-btn flex items-center justify-center w-4 h-4 rounded-sm text-muted-foreground shrink-0 hover:bg-accent hover:text-foreground ml-1"
                    role="button"
                    aria-label={`Close ${label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(id);
                    }}
                  >
                    <X className="w-2.5 h-2.5" />
                  </span>
                </div>
              );
            })}

            {/* New note tab button */}
            <button
              className={cn(actionBtnClass, "shrink-0 self-center mx-1")}
              onClick={createNoteInActiveFolder}
              title={`New note${activeCached?.data.folder_name ? ` in ${activeCached.data.folder_name}` : ""}`}
              aria-label="New note"
            >
              <Plus />
            </button>
          </div>
        </div>
      )}

      {/* ── Editor or Empty State ──────────────────────────────────── */}
      {activeNoteId && activeCached ? (
        <NoteContextMenu
          noteId={activeNoteId}
          isDirty={activeCached.saveState === "dirty"}
          allFolders={allFolders}
          currentFolder={activeCached.data.folder_name}
          noteContent={activeContent}
          textareaRef={textareaRef}
          onSave={() => forceSave(activeNoteId)}
          onDuplicate={() => duplicateNote(activeNoteId)}
          onExport={() => exportNote(activeNoteId)}
          onShareLink={() => setShareDialogNoteId(activeNoteId)}
          onShareClipboard={() => shareNote(activeNoteId)}
          onMove={(folder) => moveNote(activeNoteId, folder)}
          onCloseTab={() => closeTab(activeNoteId)}
          onCloseOtherTabs={() => closeOtherTabs(activeNoteId)}
          onCloseAllTabs={closeAllTabs}
          onDelete={() => deleteNote(activeNoteId)}
        >
          <div className="flex-1 flex flex-col overflow-hidden note-detail-active">
            {/* ── Conflict Banner ──────────────────────────────────────── */}
            {saveState === "conflict" && (
              <div className="flex items-center gap-3 py-1.5 px-4 text-xs text-foreground bg-destructive/10 border-b border-destructive/20 shrink-0">
                <span className="flex-1">
                  Modified externally. Keep yours or use server version?
                </span>
                <button
                  className="px-2 py-0.5 text-xs font-medium rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 cursor-pointer"
                  onClick={() => resolveConflict(activeNoteId, "local")}
                >
                  Keep Mine
                </button>
                <button
                  className="px-2 py-0.5 text-xs font-medium rounded border border-border bg-background text-muted-foreground cursor-pointer"
                  onClick={() => resolveConflict(activeNoteId, "server")}
                >
                  Use Server
                </button>
              </div>
            )}

            {/* ── Note header bar — mobile only (desktop uses editable tab) ─ */}
            <div className="notes-search-bar notes-note-header lg:hidden">
              {/* Chevron back — mobile only, same tap target as sidebar icon buttons */}
              <div className="notes-search-tap lg:hidden">
                <button
                  className="flex items-center justify-center w-[1.875rem] h-[1.875rem] rounded-full shell-glass shell-tactile text-muted-foreground cursor-pointer hover:text-foreground [&_svg]:w-3.5 [&_svg]:h-3.5"
                  onClick={goBack}
                  aria-label="Back to notes"
                >
                  <ChevronLeft />
                </button>
              </div>

              {/* Title input — fills remaining space, same glass pill as search input */}
              <div className="notes-search-input-wrap">
                <input
                  className="notes-title-input w-full h-[1.875rem] px-3 shell-glass rounded-full placeholder:text-muted-foreground/60 outline-none transition-colors min-w-0 truncate"
                  style={{ fontSize: "16px" }}
                  type="text"
                  value={activeLabel}
                  onChange={handleTitleChange}
                  placeholder="Note title..."
                  aria-label="Note title"
                />
              </div>

              {/* More options — opens bottom sheet with all note actions */}
              <div className="notes-search-tap">
                <button
                  className={cn(
                    "flex items-center justify-center w-[1.875rem] h-[1.875rem] rounded-full shell-glass shell-tactile text-muted-foreground cursor-pointer hover:text-foreground [&_svg]:w-3.5 [&_svg]:h-3.5",
                    showNoteOptions &&
                      "bg-(--shell-glass-bg-active)! text-foreground",
                  )}
                  onClick={() => setShowNoteOptions((v) => !v)}
                  aria-label="Note options"
                >
                  <MoreHorizontal />
                </button>
              </div>
            </div>

            {/* ── Note Options Bottom Sheet (mobile, portaled for z-index) ──── */}
            {showNoteOptions &&
              activeNoteId &&
              activeCached &&
              portalRoot &&
              createPortal(
                <NoteOptionsSheet
                  currentFolder={activeCached.data.folder_name ?? "Draft"}
                  allFolders={allFolders}
                  saveState={saveState}
                  onSave={() => forceSave(activeNoteId)}
                  onDuplicate={() => duplicateNote(activeNoteId)}
                  onShareLink={() => setShareDialogNoteId(activeNoteId)}
                  onShareClipboard={() => shareNote(activeNoteId)}
                  onExport={() => exportNote(activeNoteId)}
                  onMove={(folder) => moveNote(activeNoteId, folder)}
                  onDelete={() => deleteNote(activeNoteId)}
                  onClose={() => setShowNoteOptions(false)}
                />,
                portalRoot,
              )}

            {/* ── Editor Content ─────────────────────────────────────── */}
            {editorMode === "plain" && (
              <textarea
                ref={textareaRef}
                className="notes-editor-textarea scrollbar-thin-auto flex-1 min-h-0 w-full py-2 px-5 text-sm leading-[1.7] font-[inherit] text-foreground bg-transparent border-none outline-none resize-none overflow-y-auto placeholder:text-muted-foreground"
                value={activeContent}
                onChange={handleContentChange}
                placeholder="Start writing..."
                aria-label="Note content"
              />
            )}

            {editorMode === "preview" && (
              <div className="notes-preview-wrapper scrollbar-thin-auto flex-1 min-h-0 overflow-y-auto py-2 px-5">
                {activeContent ? (
                  <MarkdownStream
                    content={activeContent}
                    type="text"
                    role="assistant"
                    hideCopyButton
                  />
                ) : (
                  <p className="notes-preview-empty">Nothing to preview</p>
                )}
              </div>
            )}

            {editorMode === "split" && (
              <MatrxSplit
                value={activeContent}
                onChange={(val) =>
                  handleContentChange({
                    target: { value: val },
                  } as React.ChangeEvent<HTMLTextAreaElement>)
                }
                textareaRef={textareaRef}
                placeholder="Start writing..."
                className="flex-1 min-h-0"
              />
            )}

            {/* ── Tags & Folder Bar (deep hydration — renders shell immediately) */}
            <div className="flex items-center gap-2 py-1 px-4 border-t border-border/20 shrink-0 overflow-hidden min-h-[1.625rem]">
              {/* Folder selector — button that opens inline dropdown */}
              <div className="shrink-0">
                <button
                  ref={bottomFolderBtnRef}
                  className="flex items-center gap-1 text-[0.625rem] text-muted-foreground hover:text-foreground cursor-pointer transition-colors [&_svg]:w-3 [&_svg]:h-3"
                  onClick={() => setShowFolderSelect((v) => !v)}
                >
                  <Folder />
                  <span className="max-w-[80px] truncate">
                    {activeCached.data.folder_name}
                  </span>
                </button>
                {showFolderSelect && (
                  <FolderDropdown
                    triggerRef={bottomFolderBtnRef}
                    folders={allFolders}
                    currentFolder={activeCached.data.folder_name}
                    onSelect={(f) => {
                      moveNote(activeNoteId, f);
                      setShowFolderSelect(false);
                    }}
                    onClose={() => setShowFolderSelect(false)}
                    anchor="above"
                  />
                )}
              </div>

              <span className="text-border">|</span>

              {/* Tags — renders badges immediately, add input hydrates on interaction */}
              <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-thin-auto min-w-0">
                {activeCached.data.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-0.5 text-[0.625rem] px-1.5 py-0 rounded-full border border-border text-muted-foreground shrink-0"
                  >
                    {tag}
                    <button
                      className="hover:text-foreground cursor-pointer [&_svg]:w-2.5 [&_svg]:h-2.5"
                      onClick={() => removeTag(activeNoteId, tag)}
                    >
                      <X />
                    </button>
                  </span>
                ))}
                {editingTags ? (
                  <input
                    className="h-5 text-[0.625rem] px-1.5 min-w-[5rem] w-20 bg-muted rounded-md border border-border outline-none shrink-0"
                    placeholder="Tag..."
                    value={tagInputValue}
                    onChange={(e) => setTagInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = tagInputValue.trim();
                        if (v) {
                          addTag(activeNoteId, v);
                          setTagInputValue("");
                        }
                      }
                      if (e.key === "Escape") {
                        setEditingTags(false);
                        setTagInputValue("");
                      }
                    }}
                    onBlur={() => {
                      const v = tagInputValue.trim();
                      if (v) addTag(activeNoteId, v);
                      setEditingTags(false);
                      setTagInputValue("");
                    }}
                    autoFocus
                  />
                ) : (
                  <button
                    className="flex items-center gap-0.5 text-[0.625rem] text-muted-foreground hover:text-foreground cursor-pointer shrink-0 [&_svg]:w-2.5 [&_svg]:h-2.5"
                    onClick={() => setEditingTags(true)}
                  >
                    <Plus /> Tag
                  </button>
                )}
              </div>
            </div>

            {/* ── Status Bar — appears on hover only ─────────────────── */}
            <div className="notes-status-bar flex items-center gap-3 py-1 px-4 text-[0.625rem] text-muted-foreground opacity-0 h-0 overflow-hidden transition-all duration-200">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  saveState === "saved" && "bg-green-500",
                  saveState === "saving" && "bg-yellow-500 ssr-status-pulse",
                  saveState === "dirty" && "bg-amber-500",
                  saveState === "conflict" && "bg-red-500 ssr-conflict-pulse",
                )}
              />
              <span>{statusLabel}</span>
              <span>&middot;</span>
              <span>{wordCount} words</span>
              <span>&middot;</span>
              <span>{activeContent.length} chars</span>
              {activeCached.data.updated_at && (
                <>
                  <span>&middot;</span>
                  <span>
                    Updated {formatTime(activeCached.data.updated_at)}
                  </span>
                </>
              )}
            </div>
          </div>
        </NoteContextMenu>
      ) : activeNoteId ? (
        /* Loading state */
        <div className="flex-1 flex flex-col overflow-hidden note-detail-active">
          <div className="p-4 px-5 flex flex-col gap-3 flex-1">
            {[40, 80, 65, 90, 50, 75].map((w, i) => (
              <div
                key={i}
                className="animate-ssr-shimmer-opacity h-3.5 rounded bg-muted"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 [&_svg]:w-6 [&_svg]:h-6">
            <NotebookPen />
          </div>
          <h2 className="notes-empty-title">Select a note</h2>
          <p className="notes-empty-description">
            Choose a note from the sidebar to start editing, or create a new one
            with the + button.
          </p>
        </div>
      )}

      {/* ── Share Dialog (portaled for z-index) ─────────────────────── */}
      {shareDialogNoteId &&
        portalRoot &&
        createPortal(
          <NoteShareDialog
            noteId={shareDialogNoteId}
            onClose={() => setShareDialogNoteId(null)}
          />,
          portalRoot,
        )}
    </>
  );
}
