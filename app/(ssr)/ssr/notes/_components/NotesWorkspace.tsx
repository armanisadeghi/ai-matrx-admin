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
import {
  X,
  NotebookPen,
  Save,
  ChevronLeft,
  Folder,
  Tag,
  Copy,
  Trash2,
  FileText,
  Eye,
  SplitSquareHorizontal,
  Download,
  Share2,
  FolderInput,
  Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { supabase } from "@/utils/supabase/client";
import type { NoteSummary } from "../layout";
import type { MarkdownStreamProps } from "@/components/MarkdownStream";

const MarkdownStream = dynamic<MarkdownStreamProps>(
  () => import("@/components/MarkdownStream"),
  {
    ssr: false,
    loading: () => (
      <p className="text-muted-foreground italic text-sm p-4">
        Loading preview...
      </p>
    ),
  },
);

const NoteAiMenu = dynamic(() => import("./NoteAiMenu"), {
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

const ALL_FOLDERS = ["Draft", "Personal", "Business", "Prompts", "Scratch"];

// ─── URL Utilities ──────────────────────────────────────────────────────────

function extractNoteId(pathname: string): string {
  if (!pathname.startsWith("/ssr/notes/")) return "";
  return pathname.split("/ssr/notes/")[1]?.split("/")[0]?.split("?")[0] ?? "";
}

function buildNotesUrl(
  noteId: string | null,
  params: URLSearchParams,
): string {
  const base = noteId ? `/ssr/notes/${noteId}` : "/ssr/notes";
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface NotesWorkspaceProps {
  notes: NoteSummary[];
}

export default function NotesWorkspace({ notes }: NotesWorkspaceProps) {
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
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    noteId: string;
    type: "tab";
  } | null>(null);
  const [showAiMenu, setShowAiMenu] = useState(false);

  // Portal target for header center
  const [headerCenter, setHeaderCenter] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderCenter(document.getElementById("shell-header-center"));
  }, []);

  const saveTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const labelMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const n of notes) m[n.id] = n.label;
    return m;
  }, [notes]);

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
        next.set(noteId, {
          ...existing,
          data: noteData,
          fetchedAt: Date.now(),
        });
        return next;
      }

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
      fetchNote(activeNoteId);
    } else {
      const age = Date.now() - cached.fetchedAt;
      if (age > 30_000) {
        fetchNote(activeNoteId);
      }
    }
  }, [activeNoteId, fetchNote]); // intentionally NOT including noteCache

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
      const timers = saveTimerRef.current;
      const existing = timers.get(noteId);
      if (existing) clearTimeout(existing);

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
              next.set(noteId, { ...c, localEdits: null, saveState: "saved" });
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

          // Dispatch label change event for sidebar sync
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
            next.set(noteId, {
              data: {
                ...c.data,
                ...updates,
                updated_at: data?.updated_at ?? c.data.updated_at,
              },
              localEdits: null,
              saveState: "saved",
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

      // Dispatch label change for sidebar sync
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
        next.set(noteId, {
          data: {
            ...c.data,
            label,
            content,
            updated_at: data?.updated_at ?? c.data.updated_at,
          },
          localEdits: null,
          saveState: "saved",
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
      if (!cached) return;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;

      const n = cached.localEdits
        ? { ...cached.data, ...cached.localEdits }
        : cached.data;

      const { data: newNote, error } = await supabase
        .from("notes")
        .insert({
          user_id: userData.user.id,
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
    [noteCache, switchTab],
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

  const moveNote = useCallback(
    async (noteId: string, folder: string) => {
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
    },
    [],
  );

  // ── AI action handler (stub) ──────────────────────────────────────────

  const handleAiAction = useCallback(
    (action: string) => {
      // TODO: Integrate with AI service
      console.log(`AI action: ${action} on note: ${activeNoteId}`);
    },
    [activeNoteId],
  );

  // ── Resolve conflict ──────────────────────────────────────────────────

  const resolveConflict = useCallback(
    (noteId: string, choice: "local" | "server") => {
      setNoteCache((prev) => {
        const next = new Map(prev);
        const cached = next.get(noteId);
        if (!cached) return prev;

        if (choice === "server") {
          next.set(noteId, { ...cached, localEdits: null, saveState: "saved" });
        } else {
          next.set(noteId, { ...cached, saveState: "dirty" });
          if (cached.localEdits) {
            scheduleSave(noteId, cached.localEdits.label, cached.localEdits.content);
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

      if (mod && e.key === "w" && activeNoteId) {
        e.preventDefault();
        closeTab(activeNoteId);
      }

      if (e.ctrlKey && e.key === "Tab" && tabIds.length > 1) {
        e.preventDefault();
        const idx = tabIds.indexOf(activeNoteId);
        const nextIdx = e.shiftKey
          ? (idx - 1 + tabIds.length) % tabIds.length
          : (idx + 1) % tabIds.length;
        switchTab(tabIds[nextIdx]);
      }

      if (mod && e.key === "s" && activeNoteId) {
        e.preventDefault();
        forceSave(activeNoteId);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeNoteId, tabIds, closeTab, switchTab, forceSave]);

  // ── Close context menu on click outside ───────────────────────────────

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => { setContextMenu(null); setShowAiMenu(false); };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [contextMenu]);

  // ── Cleanup save timers ───────────────────────────────────────────────

  useEffect(() => {
    return () => {
      const timers = saveTimerRef.current;
      for (const t of timers.values()) clearTimeout(t);
    };
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────

  const activeCached = activeNoteId ? noteCache.get(activeNoteId) : null;
  const activeLabel = activeCached?.localEdits?.label ?? activeCached?.data.label ?? "";
  const activeContent = activeCached?.localEdits?.content ?? activeCached?.data.content ?? "";
  const visibleTabs = tabIds.filter((id) => labelMap[id] || noteCache.has(id));

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!activeNoteId) return;
    scheduleSave(activeNoteId, e.target.value, activeContent);
  };

  const handleContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeNoteId) return;
    scheduleSave(activeNoteId, activeLabel, e.target.value);
  };

  const goBack = () => updateUrl(null);

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

  const contextItemClass =
    "flex items-center gap-2 w-full py-1.5 px-2.5 text-xs text-muted-foreground bg-transparent border-none rounded-md cursor-pointer text-left transition-colors hover:bg-accent hover:text-foreground [&_svg]:w-[0.8125rem] [&_svg]:h-[0.8125rem] [&_svg]:shrink-0";

  // ─── RENDER ─────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Portal: View mode buttons into shell header center ─────── */}
      {headerCenter &&
        activeNoteId &&
        activeCached &&
        createPortal(
          <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5 border border-border">
            <button
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 text-[0.6875rem] font-medium rounded-md transition-colors cursor-pointer",
                "[&_svg]:w-3.5 [&_svg]:h-3.5",
                editorMode === "plain"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setEditorMode("plain")}
            >
              <FileText /> Edit
            </button>
            <button
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 text-[0.6875rem] font-medium rounded-md transition-colors cursor-pointer",
                "[&_svg]:w-3.5 [&_svg]:h-3.5",
                editorMode === "split"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setEditorMode("split")}
            >
              <SplitSquareHorizontal /> Split
            </button>
            <button
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 text-[0.6875rem] font-medium rounded-md transition-colors cursor-pointer",
                "[&_svg]:w-3.5 [&_svg]:h-3.5",
                editorMode === "preview"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setEditorMode("preview")}
            >
              <Eye /> Preview
            </button>
          </div>,
          headerCenter,
        )}

      {/* ── Compact Tab Row (VSCode-style) ─────────────────────────── */}
      {visibleTabs.length > 0 && (
        <div
          className="notes-tab-bar-scroll flex items-center h-8 min-h-[2rem] overflow-x-auto overflow-y-hidden border-b border-border shrink-0 lg:flex hidden"
          role="tablist"
          aria-label="Open notes"
        >
          {/* Tabs */}
          <div className="flex items-stretch flex-1 min-w-0 overflow-x-auto">
            {visibleTabs.map((id) => {
              const cached = noteCache.get(id);
              const label =
                cached?.localEdits?.label ?? cached?.data.label ?? labelMap[id] ?? "Untitled";
              const isDirty =
                cached?.saveState === "dirty" || cached?.saveState === "saving";
              const isActive = id === activeNoteId;

              return (
                <button
                  key={id}
                  className={cn(
                    "group flex items-center gap-1 px-2.5 text-[0.6875rem] font-medium border-r border-border cursor-pointer whitespace-nowrap max-w-[160px] min-w-0 shrink-0 transition-colors",
                    isActive
                      ? "bg-background text-foreground"
                      : "bg-transparent text-muted-foreground hover:bg-accent/50",
                  )}
                  role="tab"
                  data-active={isActive ? "true" : undefined}
                  aria-selected={isActive}
                  onClick={() => switchTab(id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, noteId: id, type: "tab" });
                  }}
                >
                  {isDirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  )}
                  <span className="overflow-hidden text-ellipsis">{label}</span>
                  <span
                    className="notes-tab-close-btn flex items-center justify-center w-4 h-4 rounded-sm text-muted-foreground shrink-0 hover:bg-accent hover:text-foreground ml-auto"
                    role="button"
                    aria-label={`Close ${label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(id);
                    }}
                  >
                    <X className="w-2.5 h-2.5" />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active tab action icons — right-aligned */}
          {activeNoteId && activeCached && (
            <div className="flex items-center gap-0.5 px-1.5 shrink-0 border-l border-border">
              <button
                className={cn(actionBtnClass, saveState === "dirty" && "text-amber-500")}
                onClick={() => forceSave(activeNoteId)}
                title="Save (Ctrl+S)"
              >
                <Save />
              </button>
              <button className={actionBtnClass} onClick={() => duplicateNote(activeNoteId)} title="Duplicate">
                <Copy />
              </button>
              <button className={actionBtnClass} onClick={() => shareNote(activeNoteId)} title="Copy to clipboard">
                <Share2 />
              </button>
              <button
                className={cn(actionBtnClass, "hover:text-destructive")}
                onClick={() => deleteNote(activeNoteId)}
                title="Delete"
              >
                <Trash2 />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Context Menu ───────────────────────────────────────────── */}
      {contextMenu && (
        <div
          className="fixed z-[100] min-w-[200px] p-1 bg-card/95 backdrop-blur-2xl saturate-150 border border-border rounded-lg shadow-lg"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {noteCache.get(contextMenu.noteId)?.saveState === "dirty" && (
            <button className={contextItemClass} onClick={() => { forceSave(contextMenu.noteId); setContextMenu(null); }}>
              <Save /> Save
            </button>
          )}
          <button className={contextItemClass} onClick={() => { duplicateNote(contextMenu.noteId); setContextMenu(null); }}>
            <Copy /> Duplicate
          </button>
          <button className={contextItemClass} onClick={() => { exportNote(contextMenu.noteId); setContextMenu(null); }}>
            <Download /> Export as Markdown
          </button>
          <button className={contextItemClass} onClick={() => { shareNote(contextMenu.noteId); setContextMenu(null); }}>
            <Share2 /> Copy to Clipboard
          </button>

          {/* Move to folder */}
          <div className="h-px my-1 mx-1.5 bg-border" />
          <div className="px-2.5 py-1 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider">
            Move to folder
          </div>
          {ALL_FOLDERS.map((folder) => {
            const currentFolder = noteCache.get(contextMenu.noteId)?.data.folder_name;
            const isCurrent = currentFolder === folder;
            return (
              <button
                key={folder}
                className={cn(
                  contextItemClass,
                  isCurrent && "text-amber-600 dark:text-amber-400 bg-amber-500/5",
                )}
                onClick={() => { moveNote(contextMenu.noteId, folder); setContextMenu(null); }}
                disabled={isCurrent}
              >
                <FolderInput />
                {folder}
                {isCurrent && <span className="ml-auto text-[0.625rem] opacity-50">current</span>}
              </button>
            );
          })}

          <div className="h-px my-1 mx-1.5 bg-border" />

          {/* AI Actions toggle */}
          <button
            className={cn(contextItemClass, "[&_svg]:text-purple-500")}
            onClick={(e) => { e.stopPropagation(); setShowAiMenu(!showAiMenu); }}
          >
            <Sparkles /> AI Actions
          </button>
          {showAiMenu && (
            <NoteAiMenu
              noteId={contextMenu.noteId}
              onAction={handleAiAction}
              onClose={() => setContextMenu(null)}
            />
          )}

          <div className="h-px my-1 mx-1.5 bg-border" />
          <button className={contextItemClass} onClick={() => { closeTab(contextMenu.noteId); setContextMenu(null); }}>
            <X /> Close Tab
          </button>
          <button className={contextItemClass} onClick={() => { closeOtherTabs(contextMenu.noteId); setContextMenu(null); }}>
            <X /> Close Other Tabs
          </button>
          <button className={contextItemClass} onClick={() => { closeAllTabs(); setContextMenu(null); }}>
            <X /> Close All Tabs
          </button>
          <div className="h-px my-1 mx-1.5 bg-border" />
          <button
            className={cn(contextItemClass, "text-destructive hover:bg-destructive/10 hover:text-destructive")}
            onClick={() => { deleteNote(contextMenu.noteId); setContextMenu(null); }}
          >
            <Trash2 /> Delete Note
          </button>
        </div>
      )}

      {/* ── Editor or Empty State ──────────────────────────────────── */}
      {activeNoteId && activeCached ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-background/50 note-detail-active">
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

          {/* ── Inline title + metadata (part of editor content area) ─ */}
          <div className="flex items-center gap-2 px-5 pt-3 pb-1 shrink-0">
            <button
              className="hidden max-lg:flex items-center justify-center w-6 h-6 rounded text-muted-foreground cursor-pointer shrink-0 [&_svg]:w-4 [&_svg]:h-4"
              onClick={goBack}
              aria-label="Back to notes"
            >
              <ChevronLeft />
            </button>
            <input
              className="flex-1 text-lg font-semibold text-foreground border-none bg-transparent outline-none py-0.5 min-w-0 placeholder:text-muted-foreground/50"
              type="text"
              value={activeLabel}
              onChange={handleTitleChange}
              placeholder="Note title..."
              aria-label="Note title"
            />
            <span className="inline-flex items-center gap-1 text-[0.625rem] py-0.5 px-1.5 rounded bg-muted text-muted-foreground [&_svg]:w-2.5 [&_svg]:h-2.5 shrink-0">
              <Folder />
              {activeCached.data.folder_name}
            </span>
            {activeCached.data.tags.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[0.625rem] py-0.5 px-1.5 rounded bg-muted text-muted-foreground [&_svg]:w-2.5 [&_svg]:h-2.5 shrink-0">
                <Tag />
                {activeCached.data.tags.slice(0, 2).join(", ")}
                {activeCached.data.tags.length > 2 &&
                  ` +${activeCached.data.tags.length - 2}`}
              </span>
            )}
          </div>

          {/* ── Editor Content ─────────────────────────────────────── */}
          {editorMode === "plain" && (
            <textarea
              className="notes-scrollable flex-1 w-full py-2 px-5 text-sm leading-[1.7] font-[inherit] text-foreground bg-transparent border-none outline-none resize-none overflow-y-auto placeholder:text-muted-foreground"
              value={activeContent}
              onChange={handleContentChange}
              placeholder="Start writing..."
              aria-label="Note content"
            />
          )}

          {editorMode === "preview" && (
            <div className="notes-scrollable flex-1 overflow-y-auto py-2 px-5">
              {activeContent ? (
                <MarkdownStream
                  content={activeContent}
                  type="text"
                  hideCopyButton={false}
                  allowFullScreenEditor={false}
                  className="!bg-transparent !rounded-none !p-0"
                />
              ) : (
                <p className="text-muted-foreground text-sm italic">Nothing to preview</p>
              )}
            </div>
          )}

          {editorMode === "split" && (
            <div className="notes-split-grid flex-1 grid grid-cols-[1fr_auto_1fr] overflow-hidden">
              <textarea
                className="notes-scrollable w-full py-2 px-5 text-sm leading-[1.7] font-[inherit] text-foreground bg-transparent border-none outline-none resize-none overflow-y-auto min-w-0 placeholder:text-muted-foreground"
                value={activeContent}
                onChange={handleContentChange}
                placeholder="Start writing..."
                aria-label="Note content"
              />
              <div className="notes-split-divider w-px bg-border" />
              <div className="notes-split-preview notes-scrollable overflow-y-auto py-2 px-5 min-w-0">
                {activeContent ? (
                  <MarkdownStream
                    content={activeContent}
                    type="text"
                    hideCopyButton
                    allowFullScreenEditor={false}
                    className="!bg-transparent !rounded-none !p-0"
                  />
                ) : (
                  <p className="text-muted-foreground text-sm italic">Nothing to preview</p>
                )}
              </div>
            </div>
          )}

          {/* ── Status Bar ─────────────────────────────────────────── */}
          <div className="flex items-center gap-3 py-1 px-4 text-[0.625rem] text-muted-foreground border-t border-border shrink-0">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                saveState === "saved" && "bg-green-500",
                saveState === "saving" && "bg-yellow-500 notes-status-pulse",
                saveState === "dirty" && "bg-amber-500",
                saveState === "conflict" && "bg-red-500 notes-conflict-pulse",
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
                <span>Updated {formatTime(activeCached.data.updated_at)}</span>
              </>
            )}
          </div>
        </div>
      ) : activeNoteId ? (
        /* Loading state */
        <div className="flex-1 flex flex-col overflow-hidden bg-background/50 note-detail-active">
          <div className="p-4 px-5 flex flex-col gap-3 flex-1">
            {[40, 80, 65, 90, 50, 75].map((w, i) => (
              <div
                key={i}
                className="notes-skeleton-line h-3.5 rounded bg-muted"
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
          <h2 className="text-base font-semibold text-foreground">Select a note</h2>
          <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed">
            Choose a note from the sidebar to start editing, or create a new one
            with the + button.
          </p>
        </div>
      )}
    </>
  );
}
