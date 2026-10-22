"use client";

/**
 * MemoryManager — view and edit the user's cross-project agent memory.
 *
 * These are the text files under `~/.matrx/memory/` that follow the user into
 * every sandbox. The agent reads and writes them during a session; the
 * orchestrator syncs them back on teardown. Edits here are Supabase-direct
 * (RLS-scoped to the user). A realtime subscription keeps the list fresh so
 * in-session agent edits surface without a manual refresh.
 *
 * REALTIME: `@ai-matrx/data/realtime` owns the channel (`useChannel`). What was here
 * was a raw `.channel(...).subscribe()` with a manual `removeChannel` teardown
 * and no catch-up read — so a sandbox that synced its memory back while this tab
 * was asleep left the list silently stale. `onBackfill` re-reads on every
 * recovery path.
 *
 * See docs/sandbox/MEMORY_API.md.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Plus, Save, Trash2, Loader2, Brain } from "lucide-react";
import { toast } from "@/lib/toast";
import { defineChannelNamespace } from "@ai-matrx/data/realtime";
import { useChannel } from "@ai-matrx/data/realtime/react";
import { getUserId } from "@/utils/auth/getUserId";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import {
  listMemory,
  upsertMemory,
  deleteMemory,
  type MemoryEntry,
} from "../service/memoryService";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ReadFailure } from "@ai-matrx/design-system";
import { Checkbox } from "@/components/ui/checkbox";
import { RowSelectionBar, useRowSelection } from "@/lib/entity-list/RowSelectionBar";
import { memoryBulkActions } from "./memoryBulkActions";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import { collectionWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/collection-write-targets";
import {
  MY_MEMORY_SURFACE_NAME,
  createMyMemoryScope,
  parseMemoryFileDeletes,
  parseMemoryFileWrites,
  type MemoryFileWrite,
} from "@/features/surfaces/manifests/my-memory.manifest";

const PATH_RE = /^[A-Za-z0-9._/-]+$/;

/** One place names this channel. A second, different declaration throws. */
const memoryChannel = defineChannelNamespace({
  namespace: "user-memory",
  parts: ["userId"],
  description: "users.user_memory rows for one user",
});

/**
 * `asSurface` (the /memory/my-memory page) mounts the `matrx-user/my-memory`
 * surface around the editor: its values and write targets. The Settings tab
 * renders the same editor without it.
 */
export default function MemoryManager({ asSurface = false }: { asSurface?: boolean } = {}) {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newPath, setNewPath] = useState("");
  // Track the loaded content so we can detect unsaved edits.
  const loadedContentRef = useRef("");

  const refresh = useCallback(async () => {
    try {
      const data = await listMemory();
      setEntries(data);
      setLoadError(null);
      return data;
    } catch (err) {
      setLoadError(err ?? new Error("Failed to load memory"));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Realtime — the orchestrator rewrites rows on sandbox teardown; reflect
  // those edits live. RLS scopes the stream to the user's own rows; we add an
  // explicit owner filter as well.
  const userId = getUserId();
  useChannel(
    userId
      ? {
          topic: memoryChannel.topic({ userId }),
          postgresChanges: [
            {
              event: "*",
              schema: "users",
              table: "user_memory",
              filter: `created_by=eq.${userId}`,
              rowId: (row) => (typeof row.id === "string" ? row.id : undefined),
              fingerprint: (row) => String(row.content ?? ""),
              onChange: () => {
                void refresh();
              },
            },
          ],
          // Realtime has no replay. A sandbox syncing memory back while this tab
          // slept would otherwise never show up.
          onBackfill: () => {
            void refresh();
          },
        }
      : null,
  );

  const selectEntry = useCallback(
    (entry: MemoryEntry) => {
      setCreatingNew(false);
      setSelectedPath(entry.path);
      setDraft(entry.content);
      loadedContentRef.current = entry.content;
    },
    [],
  );

  const startNew = useCallback(() => {
    setCreatingNew(true);
    setSelectedPath(null);
    setNewPath("");
    setDraft("");
    loadedContentRef.current = "";
  }, []);

  const handleSave = useCallback(async () => {
    const path = creatingNew ? newPath.trim() : selectedPath;
    if (!path) {
      toast.error("Enter a file path (e.g. preferences.md)");
      return;
    }
    if (!PATH_RE.test(path) || path.startsWith("/") || path.includes("..")) {
      toast.error(
        "Invalid path. Use letters, numbers, '.', '_', '-', '/' — no leading slash or '..'",
      );
      return;
    }
    setSaving(true);
    try {
      await upsertMemory(path, draft);
      loadedContentRef.current = draft;
      toast.success("Memory saved");
      const data = await refresh();
      const saved = data.find((e) => e.path === path);
      if (saved) selectEntry(saved);
      setCreatingNew(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [creatingNew, newPath, selectedPath, draft, refresh, selectEntry]);

  const handleDelete = useCallback(async () => {
    if (!selectedPath) return;
    const ok = await confirm({
      title: "Move memory file to Trash?",
      description: `"${selectedPath}" will be removed from your agent memory. You can restore it from Trash.`,
      confirmLabel: "Move to Trash",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await deleteMemory(selectedPath);
      toast.success("Memory moved to Trash");
      setSelectedPath(null);
      setDraft("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move to Trash");
    }
  }, [selectedPath, refresh]);

  const ticked = useRowSelection(entries, (e) => e.path);
  const bulkActions = memoryBulkActions((paths) => {
    // The open file left with the bulk move: close its editor too.
    if (selectedPath && paths.includes(selectedPath)) {
      setSelectedPath(null);
      setDraft("");
      loadedContentRef.current = "";
    }
  });

  const dirty = creatingNew
    ? draft.length > 0 || newPath.length > 0
    : selectedPath !== null && draft !== loadedContentRef.current;

  // ── Surface (only when the page mounts it) ────────────────────────────────
  const getScope = () =>
    createMyMemoryScope({
      load_status: loading ? "loading" : loadError && entries.length === 0 ? "failed" : "loaded",
      memory_file_count: entries.length,
      memory_files: entries.map((e) => ({ path: e.path, chars: e.content.length, updated_at: e.updated_at })),
      ...(creatingNew ? { open_file_path: newPath, is_new_file: true } : selectedPath ? { open_file_path: selectedPath, is_new_file: false } : {}),
      ...(creatingNew || selectedPath ? { open_file_content: draft, unsaved_changes: dirty } : {}),
    });

  const paths = () => entries.map((e) => e.path);

  /** After an agent save: refresh the list, and reload the open file unless it holds unsaved edits. */
  const afterAgentSave = async (touched: string[]) => {
    const data = await refresh();
    if (selectedPath && touched.includes(selectedPath) && !dirty) {
      const saved = data.find((e) => e.path === selectedPath);
      if (saved) selectEntry(saved);
      else {
        setSelectedPath(null);
        setDraft("");
        loadedContentRef.current = "";
      }
    }
  };

  const getWriteHandlers = () => ({
    open_file_content: {
      validate: (value: unknown) => {
        if (!creatingNew && selectedPath === null) refuseSurfaceWrite("No file is open. Ask the person to open one, or use create_memory_files.");
        if (typeof value !== "string") refuseSurfaceWrite("The file text takes a plain string.");
      },
      apply: (value: unknown) => {
        setDraft(String(value));
        return { summary: "The editor text is replaced. Nothing is saved until the person presses Save." };
      },
    },
    ...collectionWriteHandlers(
      {
        plural: "memory_files",
        singular: "memory file",
        create: {
          parse: (value: unknown) => parseMemoryFileWrites(value, paths(), "create"),
          run: async (file: MemoryFileWrite) => {
            await upsertMemory(file.path, file.content);
            await afterAgentSave([file.path]);
            return { id: file.path, name: file.path };
          },
          nameOf: (file: MemoryFileWrite) => file.path,
        },
        update: {
          parse: (value: unknown) => parseMemoryFileWrites(value, paths(), "update"),
          run: async (file: MemoryFileWrite) => {
            await upsertMemory(file.path, file.content);
            await afterAgentSave([file.path]);
            return { id: file.path, name: file.path };
          },
          nameOf: (file: MemoryFileWrite) => file.path,
          changedOf: () => ["content"],
        },
        delete: {
          parse: (value: unknown) => parseMemoryFileDeletes(value, paths()),
          run: async (path: string) => {
            await deleteMemory(path);
            await afterAgentSave([path]);
            return { id: path, name: path };
          },
          nameOf: (path: string) => path,
        },
      },
      refuseSurfaceWrite,
    ),
  });

  const body = (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <Brain className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Notes your agents read and write, in every sandbox.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 min-h-[320px]">
        {/* List */}
        <div className="rounded-md border border-border bg-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground">
              Files
            </span>
            <button
              onClick={startNew}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="h-3 w-3" />
              New
            </button>
          </div>
          {entries.length > 0 ? (
            <div className="border-b border-border p-1">
              <RowSelectionBar
                selection={ticked}
                idOf={(e) => e.path}
                actions={bulkActions}
                noun="memory file"
                plural="files"
                compact
                onRefresh={() => void refresh()}
              />
            </div>
          ) : null}
          <div className="flex-1 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading…
              </div>
            ) : loadError && entries.length === 0 ? (
              <ReadFailure
                error={loadError}
                what="your memory files"
                onRetry={() => void refresh()}
                className="m-1"
              />
            ) : entries.length === 0 && !creatingNew ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No memory yet. Add your first note.
              </p>
            ) : (
              entries.map((e) => (
                <div key={e.path} className="flex items-center pl-2">
                  <Checkbox
                    checked={ticked.has(e.path)}
                    onCheckedChange={() => ticked.toggle(e.path)}
                    aria-label={`Select ${e.path}`}
                  />
                  <button
                    onClick={() => selectEntry(e)}
                    className={`flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-left text-xs transition-colors ${
                      selectedPath === e.path
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/60"
                    }`}
                  >
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate">{e.path}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="rounded-md border border-border bg-card flex flex-col overflow-hidden">
          {creatingNew || selectedPath !== null ? (
            <>
              <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border">
                {creatingNew ? (
                  <input
                    autoFocus
                    value={newPath}
                    onChange={(ev) => setNewPath(ev.target.value)}
                    placeholder="preferences.md"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                  />
                ) : (
                  <span className="flex-1 text-sm text-foreground truncate">
                    {selectedPath}
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-accent/60 disabled:opacity-40 transition-colors"
                >
                  {saving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                  Save
                </button>
                {!creatingNew && selectedPath && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <ProTextarea
                wrapperClassName="min-h-0 flex-1"
                value={draft}
                onChange={(ev) => setDraft(ev.target.value)}
                placeholder="# Notes the agent should remember…"
                spellCheck={false}
                className="flex-1 resize-none bg-transparent p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none font-mono min-h-[260px]"
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-muted-foreground">
              Select a file to edit, or create a new one.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!asSurface) return body;
  return (
    <SurfaceRuntimeProvider surfaceName={MY_MEMORY_SURFACE_NAME} getScope={getScope} getWriteHandlers={getWriteHandlers}>
      {body}
    </SurfaceRuntimeProvider>
  );
}
