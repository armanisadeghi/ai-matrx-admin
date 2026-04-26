import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store.types";
import { selectCodeTabs } from "../redux/tabsSlice";
import type { EditorFile } from "../types";

/**
 * Editor → Agent Context Bridge
 *
 * Wire format consumed by the Python agent's `ctx_get` primitive. Each open
 * editor tab produces one detail entry plus contributes a row to a single
 * summary entry:
 *
 *   editor.tabs              — { tabs: [{ id, path, language, dirty }, …], activeId }
 *   editor.tab.<id>          — { id, path, name, language, content, dirty,
 *                                pristineContent, remoteUpdatedAt? }
 *   editor.selection.<id>    — { id, path, language, selection: { startLine,
 *                                endLine, startColumn, endColumn }, text }
 *
 * The summary entry is intentionally compact (no buffer content) so an agent
 * can ask `ctx_get("editor.tabs")` to discover what's open without dragging
 * megabytes through the prompt; it then `ctx_get("editor.tab.<id>")` for the
 * specific buffers it needs.
 */

export const EDITOR_TABS_KEY = "editor.tabs";
export const editorTabKey = (tabId: string) => `editor.tab.${tabId}`;
export const editorSelectionKey = (tabId: string) =>
  `editor.selection.${tabId}`;

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
 * open tabs. Re-runs only when tabsSlice references change, so even a chatty
 * editor surface only re-derives this when a tab is opened, closed, edited
 * (debounced upstream), or saved.
 */
export const selectEditorContextEntries = createSelector(
  [selectCodeTabs],
  (tabsState): EditorContextEntryInput[] => {
    const entries: EditorContextEntryInput[] = [];
    const summary: EditorTabsSummary = {
      tabs: tabsState.order
        .map((id) => tabsState.byId[id])
        .filter((tab): tab is EditorFile => Boolean(tab))
        .map(summarizeTab),
      activeId: tabsState.activeId,
    };
    entries.push({
      key: EDITOR_TABS_KEY,
      value: summary,
      label: "Open editor tabs",
      type: "json",
    });
    for (const id of tabsState.order) {
      const tab = tabsState.byId[id];
      if (!tab) continue;
      entries.push({
        key: editorTabKey(id),
        value: tabPayload(tab),
        label: `Editor: ${tab.name}`,
        type: "json",
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
 * the next dispatch.
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
