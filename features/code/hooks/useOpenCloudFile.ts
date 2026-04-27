"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { getFileFromState } from "@/features/files/redux/selectors";
import { openTab, setActiveTab } from "../redux/tabsSlice";

/**
 * Tab id prefix for editor tabs backed by a cloud-files (`cld_files`)
 * record. Tabs with this prefix render through `CloudFilePreviewer`
 * (the canonical `FilePreview` wrapped in an editor tab) instead of
 * `MonacoEditor` or `BinaryFileViewer`.
 */
export const CLOUD_FILE_TAB_PREFIX = "cloud-file:";

export function cloudFileTabId(cloudFileId: string): string {
  return `${CLOUD_FILE_TAB_PREFIX}${cloudFileId}`;
}

export function isCloudFileTabId(id: string): boolean {
  return id.startsWith(CLOUD_FILE_TAB_PREFIX);
}

export function cloudFileIdFromTabId(id: string): string | null {
  if (!isCloudFileTabId(id)) return null;
  return id.slice(CLOUD_FILE_TAB_PREFIX.length);
}

/**
 * Open a cloud file (`cld_files` row) as a `cloud-file-preview` editor
 * tab. If the tab already exists, just focus it.
 *
 * The tab carries `cloudFileId` and `mime`; the previewer reads
 * everything else (signed URL, file size, etc.) from the cloud-files
 * Redux slice. We don't fetch bytes here — the `<FilePreview>` pipeline
 * handles signed-URL minting and lazy chunk loading.
 *
 * Falls back gracefully when the file isn't yet in the store: the tab
 * still opens with the best metadata we have (id only) and the
 * previewer renders its own "File not found." state until the
 * cloud-files realtime channel hydrates the record.
 */
export function useOpenCloudFile() {
  const dispatch = useAppDispatch();
  const store = useAppStore();

  return useCallback(
    (cloudFileId: string): void => {
      if (!cloudFileId) return;
      const tabId = cloudFileTabId(cloudFileId);

      // Short-circuit: tab already open → focus.
      const state = store.getState();
      if (state.codeTabs?.byId?.[tabId]) {
        dispatch(setActiveTab(tabId));
        return;
      }

      const record = getFileFromState(state, cloudFileId);
      const name = record?.fileName ?? "Untitled file";
      const mime = record?.mimeType ?? undefined;

      dispatch(
        openTab({
          id: tabId,
          // Synthetic display path — never resolved against any
          // FilesystemAdapter. The leading `cloud-file:` matches the
          // tab-id convention so debugging is easy.
          path: `cloud-file:/${name}`,
          name,
          language: "plaintext",
          content: "",
          pristineContent: "",
          kind: "cloud-file-preview",
          cloudFileId,
          mime,
        }),
      );
    },
    [dispatch, store],
  );
}
