"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import {
  codeFilesActions,
  saveFileNow,
  selectCodeFileById,
} from "@/features/code-files";
import {
  markTabSaved,
  selectActiveTab,
  selectTabById,
} from "../redux/tabsSlice";
import { useCodeWorkspace } from "../CodeWorkspaceProvider";
import { codeFileIdFromTabId, isLibraryTabId } from "./useOpenLibraryFile";

export interface SaveResult {
  tabId: string;
  ok: boolean;
  error?: string;
}

/**
 * Save the currently active editor tab. Routes by tab-id convention:
 *
 *   - `library:<codeFileId>` tabs    → `code_files` via `saveFileNow` thunk
 *   - everything else                 → the active filesystem adapter's
 *                                       `writeFile` (sandbox / mock)
 *
 * Both branches update the tab slice's dirty flag via `markTabSaved` on
 * success so the editor UI reflects reality without the caller having to.
 *
 * Returns a structured `SaveResult` (never throws) so keyboard shortcut
 * handlers and UI buttons can treat errors uniformly.
 */
export function useSaveActiveTab() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const { filesystem } = useCodeWorkspace();

  return useCallback(
    async (tabIdOverride?: string): Promise<SaveResult | null> => {
      const state = store.getState();
      const tab = tabIdOverride
        ? selectTabById(tabIdOverride)(state)
        : selectActiveTab(state);
      if (!tab) return null;
      if (!tab.dirty) return { tabId: tab.id, ok: true };

      // Branch 1: library tab → route to code-files thunk.
      if (isLibraryTabId(tab.id)) {
        const codeFileId = codeFileIdFromTabId(tab.id);
        if (!codeFileId) {
          return { tabId: tab.id, ok: false, error: "Invalid library tab id" };
        }
        const existing = selectCodeFileById(state, codeFileId);
        if (!existing) {
          return { tabId: tab.id, ok: false, error: "Code file not in store" };
        }
        // Sync the tab's current buffer into the code-files slice so
        // saveFileNow has the latest content and records dirty status.
        if (existing.content !== tab.content) {
          dispatch(
            codeFilesActions.setLocalContent({
              id: codeFileId,
              content: tab.content,
            }),
          );
        } else if (!existing._dirty) {
          // Content matches but the slice thinks it's clean — mark dirty
          // so saveFileNow doesn't early-return on `!rec._dirty`.
          dispatch(
            codeFilesActions.setLocalContent({
              id: codeFileId,
              content: tab.content,
            }),
          );
        }
        try {
          await dispatch(saveFileNow({ id: codeFileId })).unwrap();
          dispatch(markTabSaved(tab.id));
          return { tabId: tab.id, ok: true };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { tabId: tab.id, ok: false, error: message };
        }
      }

      // Branch 2: filesystem-adapter tab → writeFile to the adapter.
      if (!filesystem.writable || !filesystem.writeFile) {
        return {
          tabId: tab.id,
          ok: false,
          error: `Filesystem "${filesystem.label}" is read-only`,
        };
      }
      try {
        await filesystem.writeFile(tab.path, tab.content);
        dispatch(markTabSaved(tab.id));
        return { tabId: tab.id, ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { tabId: tab.id, ok: false, error: message };
      }
    },
    [dispatch, filesystem, store],
  );
}
