import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import { selectCodeTabs, selectRecentTabIds } from "../redux/tabsSlice";
import {
  selectActiveFilesystemLabel,
  selectActiveFilesystemRoot,
  selectEditorMode,
  type EditorMode,
} from "../redux/codeWorkspaceSlice";
import {
  selectAllDiagnostics,
  type EditorDiagnostic,
} from "../redux/diagnosticsSlice";
import type { EditorFile } from "../types";
import { isPreviewTab } from "../types";

/**
 * Editor → Agent Context Bridge
 *
 * Wire format consumed by the Python agent's `ctx_get` primitive. Each open
 * editor tab contributes a row to the summary entry, plus the **active tab
 * only** ships its full content payload. Non-active text tabs are listed as
 * metadata so the agent knows what's open and can opt-in via tools.
 *
 *   editor.tabs              — { tabs: [{ id, path, language, dirty }, …], activeId }
 *   editor.activeFile        — { id, path, name, language, dirty } | null
 *   editor.tab.<activeId>    — { id, path, name, language, content, dirty,
 *                                pristineContent, remoteUpdatedAt? }
 *   editor.recentFiles       — [{ id, path, name, language }] — MRU stack,
 *                              dropped down to last RECENT_FILES_CAP entries.
 *   editor.selection.<id>    — { id, path, language, selection: { startLine,
 *                                endLine, startColumn, endColumn }, text }
 *   workspace.root           — string | null (active filesystem rootPath)
 *   workspace.source         — { mode: "sandbox"|"cloud"|"mock", label,
 *                                rootPath } — single source of truth for
 *                              the agent to know how to fetch more.
 *   workspace.tools          — sandbox mode only: a short hint telling the
 *                              agent it has direct FS tools available, with
 *                              the tool names — see SANDBOX_TOOLS_HINT.
 *
 * The summary stays compact (no buffer content) so an agent can do
 * `ctx_get("editor.tabs")` to see what's open without dragging buffers
 * through the prompt; it then reads any non-active file via its
 * read_file / read_lines tools.
 */

export const EDITOR_TABS_KEY = "editor.tabs";
export const EDITOR_ACTIVE_FILE_KEY = "editor.activeFile";
export const EDITOR_RECENT_FILES_KEY = "editor.recentFiles";
export const EDITOR_DIAGNOSTICS_KEY = "editor.diagnostics";
export const WORKSPACE_ROOT_KEY = "workspace.root";
export const WORKSPACE_SOURCE_KEY = "workspace.source";
export const WORKSPACE_TOOLS_KEY = "workspace.tools";
export const editorTabKey = (tabId: string) => `editor.tab.${tabId}`;
export const editorSelectionKey = (tabId: string) =>
  `editor.selection.${tabId}`;

/**
 * Hint shipped only in sandbox mode — tells the agent which FS tools are
 * available inside the container so it stops trying to ask the user for
 * file content it can read on its own. Kept short on purpose; the actual
 * tool descriptors travel separately on the agent definition.
 */
export const SANDBOX_TOOLS_HINT = [
  "You are connected to a sandbox container with direct filesystem access.",
  "Use the in-container tools to read, list, search, and modify files —",
  "do NOT ask the user to paste file contents.",
  "",
  "Available tools (call directly):",
  "  read_file(path)            — read any text file",
  "  list_dir(path)             — list a directory",
  "  search_paths(pattern)      — find files by name/glob",
  "  search_content(query)      — grep across the workspace",
  "  apply_diff(path, diff)     — propose a SEARCH/REPLACE diff (preferred",
  "                               for edits — the user will accept/reject)",
  "  run_shell(command)         — run a command (use for build/test/lint)",
  "",
  "Always prefer `apply_diff` for edits so the user sees an inline diff",
  "in their editor and can accept or reject before it touches disk.",
].join("\n");

export interface EditorTabsSummary {
  tabs: Array<{
    id: string;
    path: string;
    name: string;
    language: string;
    dirty: boolean;
  }>;
  activeId: string | null;
}

export interface EditorTabContextValue {
  id: string;
  path: string;
  name: string;
  language: string;
  content: string;
  pristineContent: string;
  dirty: boolean;
  remoteUpdatedAt?: string;
}

export interface EditorActiveFileValue {
  id: string;
  path: string;
  name: string;
  language: string;
  dirty: boolean;
}

export interface EditorRecentFileValue {
  id: string;
  path: string;
  name: string;
  language: string;
  /** True when the file is still open in a tab; false if it was closed
   *  but stayed in the MRU stack. */
  open: boolean;
}

export interface WorkspaceSourceValue {
  mode: EditorMode;
  label: string | null;
  rootPath: string | null;
}

/**
 * Diagnostics payload — one entry per Monaco marker for the **active tab
 * only**, plus a top-level summary so an agent doesn't have to re-count.
 *
 * Mirrors `EditorDiagnostic[]` from `diagnosticsSlice` with a small
 * counts header so the agent can see "5 errors, 12 warnings" without
 * scanning the list.
 */
export interface EditorDiagnosticsValue {
  tabId: string | null;
  counts: {
    error: number;
    warning: number;
    info: number;
    hint: number;
    total: number;
  };
  diagnostics: EditorDiagnostic[];
}

export interface EditorContextEntryInput {
  key: string;
  value: unknown;
  label: string;
  type: "json" | "text";
}

function summarizeTab(tab: EditorFile) {
  return {
    id: tab.id,
    path: tab.path,
    name: tab.name,
    language: tab.language,
    dirty: !!tab.dirty,
  };
}

function tabPayload(tab: EditorFile): EditorTabContextValue {
  return {
    id: tab.id,
    path: tab.path,
    name: tab.name,
    language: tab.language,
    content: tab.content,
    pristineContent: tab.pristineContent,
    dirty: !!tab.dirty,
    remoteUpdatedAt: tab.remoteUpdatedAt,
  };
}

/**
 * Selector that builds the full editor-context entry list for the current
 * open tabs + workspace. Re-runs only when its inputs change references —
 * which is roughly: tab opens/closes, content edits (debounced upstream),
 * tab activation, MRU touches, or filesystem swap.
 *
 * Per the agreed strategy:
 *   - **Active tab** ships full content via `editor.tab.<id>`.
 *   - **Non-active tabs** are listed in `editor.tabs` as metadata only.
 *     The agent reads them on demand via its filesystem tools (sandbox
 *     mode) or via Python-side fetch (cloud mode).
 *   - **Binary previews** never carry content and never appear as a
 *     `editor.tab.<id>` entry; they still show up in the summary so the
 *     agent knows which images/PDFs the user has on screen.
 */
export const selectEditorContextEntries = createSelector(
  [
    selectCodeTabs,
    selectRecentTabIds,
    selectActiveFilesystemRoot,
    selectActiveFilesystemLabel,
    selectEditorMode,
    selectAllDiagnostics,
  ],
  (
    tabsState,
    recentTabIds,
    fsRoot,
    fsLabel,
    mode,
    diagnosticsByTabId,
  ): EditorContextEntryInput[] => {
    const entries: EditorContextEntryInput[] = [];
    const allTabs = tabsState.order
      .map((id) => tabsState.byId[id])
      .filter((tab): tab is EditorFile => Boolean(tab));
    const activeTab = tabsState.activeId
      ? tabsState.byId[tabsState.activeId]
      : null;

    // ── editor.tabs (summary, all open tabs incl. binary) ──────────────────
    const summary: EditorTabsSummary = {
      tabs: allTabs.map(summarizeTab),
      activeId: tabsState.activeId,
    };
    entries.push({
      key: EDITOR_TABS_KEY,
      value: summary,
      label: "Open editor tabs",
      type: "json",
    });

    // ── editor.activeFile (lightweight, no content) ────────────────────────
    entries.push({
      key: EDITOR_ACTIVE_FILE_KEY,
      value: activeTab
        ? ({
            id: activeTab.id,
            path: activeTab.path,
            name: activeTab.name,
            language: activeTab.language,
            dirty: !!activeTab.dirty,
          } satisfies EditorActiveFileValue)
        : null,
      label: "Active editor file",
      type: "json",
    });

    // ── editor.tab.<active> (full content, ACTIVE ONLY) ────────────────────
    // Other text tabs deliberately do NOT carry content — see header.
    // Preview tabs (binary / cloud-file) have no editable buffer.
    if (activeTab && !isPreviewTab(activeTab.kind)) {
      entries.push({
        key: editorTabKey(activeTab.id),
        value: tabPayload(activeTab),
        label: `Editor: ${activeTab.name}`,
        type: "json",
      });
    }

    // ── editor.diagnostics (active tab only, with a counts header) ─────────
    // Always shipped so the agent can verify "no diagnostics" even when
    // the slice is empty. Counts are derived from Monaco markers via
    // `useMonacoMarkers` — populated only on surfaces that mount the hook.
    const activeDiagnostics = activeTab
      ? (diagnosticsByTabId[activeTab.id] ?? [])
      : [];
    const counts = activeDiagnostics.reduce(
      (acc, d) => {
        acc[d.severity] += 1;
        acc.total += 1;
        return acc;
      },
      { error: 0, warning: 0, info: 0, hint: 0, total: 0 },
    );
    entries.push({
      key: EDITOR_DIAGNOSTICS_KEY,
      value: {
        tabId: activeTab?.id ?? null,
        counts,
        diagnostics: activeDiagnostics,
      } satisfies EditorDiagnosticsValue,
      label: "Editor diagnostics",
      type: "json",
    });

    // ── editor.recentFiles (MRU, metadata only) ────────────────────────────
    const recentFiles: EditorRecentFileValue[] = recentTabIds
      .map((id) => {
        const tab = tabsState.byId[id];
        if (!tab) {
          // Tab was closed since it was last touched. We still surface it
          // so the agent knows the user was looking at it recently — but
          // we can only resolve metadata that lives in the id. The id
          // shape is `<filesystemId>:<path>`; split once and fall back to
          // the basename for `name`.
          const colon = id.indexOf(":");
          const path = colon === -1 ? id : id.slice(colon + 1);
          const name = path.split("/").pop() ?? path;
          return {
            id,
            path,
            name,
            language: "plaintext",
            open: false,
          } satisfies EditorRecentFileValue;
        }
        return {
          id: tab.id,
          path: tab.path,
          name: tab.name,
          language: tab.language,
          open: true,
        } satisfies EditorRecentFileValue;
      })
      .filter((f) => Boolean(f.path));
    entries.push({
      key: EDITOR_RECENT_FILES_KEY,
      value: recentFiles,
      label: "Recently opened files",
      type: "json",
    });

    // ── workspace.root + workspace.source ──────────────────────────────────
    entries.push({
      key: WORKSPACE_ROOT_KEY,
      value: fsRoot,
      label: "Workspace root path",
      type: "json",
    });
    entries.push({
      key: WORKSPACE_SOURCE_KEY,
      value: {
        mode,
        label: fsLabel,
        rootPath: fsRoot,
      } satisfies WorkspaceSourceValue,
      label: "Workspace source",
      type: "json",
    });

    // ── workspace.tools (sandbox-only hint) ────────────────────────────────
    if (mode === "sandbox") {
      entries.push({
        key: WORKSPACE_TOOLS_KEY,
        value: SANDBOX_TOOLS_HINT,
        label: "In-container filesystem tools",
        type: "text",
      });
    }

    return entries;
  },
);

/**
 * Build the entry list filtered by an opt-out set of disabled tab ids,
 * which are stored on the active conversation's instanceUIState.
 *
 * Used by `useSyncEditorContext` after reading the disabled set from Redux
 * so the user's per-conversation include/exclude toggles take effect on
 * the next dispatch. Note: only `editor.tabs` (summary) and
 * `editor.tab.<id>` (active payload) are filtered — workspace-level
 * entries always ship.
 */
export function filterDisabledTabs(
  entries: EditorContextEntryInput[],
  disabledIds: string[] | undefined,
): EditorContextEntryInput[] {
  if (!disabledIds || disabledIds.length === 0) return entries;
  const disabled = new Set(disabledIds);
  const out: EditorContextEntryInput[] = [];
  for (const entry of entries) {
    if (entry.key === EDITOR_TABS_KEY) {
      const summary = entry.value as EditorTabsSummary;
      out.push({
        ...entry,
        value: {
          ...summary,
          tabs: summary.tabs.filter((t) => !disabled.has(t.id)),
        },
      });
      continue;
    }
    if (entry.key === EDITOR_ACTIVE_FILE_KEY) {
      const active = entry.value as EditorActiveFileValue | null;
      if (active && disabled.has(active.id)) {
        out.push({ ...entry, value: null });
        continue;
      }
    }
    if (entry.key === EDITOR_DIAGNOSTICS_KEY) {
      const value = entry.value as EditorDiagnosticsValue;
      if (value.tabId && disabled.has(value.tabId)) {
        out.push({
          ...entry,
          value: {
            tabId: null,
            counts: { error: 0, warning: 0, info: 0, hint: 0, total: 0 },
            diagnostics: [],
          } satisfies EditorDiagnosticsValue,
        });
        continue;
      }
    }
    if (entry.key.startsWith("editor.tab.")) {
      const id = entry.key.slice("editor.tab.".length);
      if (disabled.has(id)) continue;
    }
    out.push(entry);
  }
  return out;
}

/**
 * Convenience root-state accessor for tests / non-React callers.
 */
export function getEditorContextEntries(
  state: RootState,
): EditorContextEntryInput[] {
  return selectEditorContextEntries(state);
}
