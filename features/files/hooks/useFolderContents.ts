/**
 * features/files/hooks/useFolderContents.ts
 *
 * Returns the normalized children of a folder (files + subfolders), sorted
 * per UI settings. Triggers a fetch if the folder hasn't been fully loaded
 * yet.
 */

"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAllFilesMap,
  selectAllFoldersMap,
  selectIsFolderFullyLoaded,
  selectSortedChildrenOfFolder,
  selectSortedRootChildren,
} from "../redux/selectors";
import { loadFolderContents } from "../redux/thunks";
import type { CloudFileRecord, CloudFolderRecord } from "../types";

export interface UseFolderContentsResult {
  files: CloudFileRecord[];
  folders: CloudFolderRecord[];
  loading: boolean;
}

/**
 * Pass `null` for root (the user's top-level tree).
 */
export function useFolderContents(
  folderId: string | null,
): UseFolderContentsResult {
  const dispatch = useAppDispatch();

  const fullyLoaded = useAppSelector((s) =>
    folderId ? selectIsFolderFullyLoaded(s, folderId) : true,
  );

  useEffect(() => {
    if (!folderId || fullyLoaded) return;
    void dispatch(loadFolderContents({ folderId }));
  }, [dispatch, folderId, fullyLoaded]);

  // Fetch sorted children; when folderId is null, use root.
  const rootSorted = useAppSelector(selectSortedRootChildren);
  const folderSorted = useAppSelector((s) =>
    folderId
      ? selectSortedChildrenOfFolder(s, folderId)
      : { folderIds: [], fileIds: [] },
  );
  const children = folderId ? folderSorted : rootSorted;

  const filesById = useAppSelector(selectAllFilesMap);
  const foldersById = useAppSelector(selectAllFoldersMap);

  const files = children.fileIds
    .map((id) => filesById[id])
    .filter(Boolean) as CloudFileRecord[];
  const folders = children.folderIds
    .map((id) => foldersById[id])
    .filter(Boolean) as CloudFolderRecord[];

  return { files, folders, loading: !fullyLoaded };
}
