/**
 * features/files/redux/tree-utils.ts
 *
 * Pure helpers for deriving a renderable tree from the normalized slice state.
 * Selectors + components consume these; no Redux imports here.
 */

import type {
  CloudFileRecord,
  CloudFolderRecord,
  SortBy,
  SortDirection,
  TreeChildren,
  TreeState,
} from "../types";

// ---------------------------------------------------------------------------
// Ancestry
// ---------------------------------------------------------------------------

/**
 * Walks up from a folder id to the root. Returns the chain ordered
 * root → target (includes target). Stops at the first missing parent to avoid
 * infinite loops on cyclic data.
 */
export function getFolderAncestors(
  foldersById: Record<string, CloudFolderRecord>,
  folderId: string,
): CloudFolderRecord[] {
  const chain: CloudFolderRecord[] = [];
  const seen = new Set<string>();
  let current: string | null = folderId;
  while (current && !seen.has(current)) {
    seen.add(current);
    const folder = foldersById[current];
    if (!folder) break;
    chain.unshift(folder);
    current = folder.parentId;
  }
  return chain;
}

/**
 * Ancestors of a file — walks from parentFolderId upward. If the file has no
 * parent folder, returns [].
 */
export function getFileAncestors(
  file: CloudFileRecord,
  foldersById: Record<string, CloudFolderRecord>,
): CloudFolderRecord[] {
  if (!file.parentFolderId) return [];
  return getFolderAncestors(foldersById, file.parentFolderId);
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

export interface SortableNode {
  id: string;
  name: string;
  kind: "file" | "folder";
  size: number;
  updatedAt: string;
  type: string;
}

function fileToSortable(record: CloudFileRecord): SortableNode {
  return {
    id: record.id,
    name: record.fileName,
    kind: "file",
    size: record.fileSize ?? 0,
    updatedAt: record.updatedAt,
    type:
      record.mimeType ??
      record.fileName.split(".").pop()?.toLowerCase() ??
      "",
  };
}

function folderToSortable(record: CloudFolderRecord): SortableNode {
  return {
    id: record.id,
    name: record.folderName,
    kind: "folder",
    size: 0,
    updatedAt: record.updatedAt,
    type: "folder",
  };
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

function compareNodes(
  a: SortableNode,
  b: SortableNode,
  sortBy: SortBy,
): number {
  // Folders always sort before files — mimics Dropbox / Drive behavior.
  if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
  switch (sortBy) {
    case "name":
      return compareStrings(a.name, b.name);
    case "size":
      return a.size - b.size;
    case "updated_at":
      return compareStrings(a.updatedAt, b.updatedAt);
    case "type":
      return compareStrings(a.type, b.type) || compareStrings(a.name, b.name);
    default:
      return 0;
  }
}

/**
 * Sort a heterogeneous list of folder + file ids. Returns two lists (folders
 * first, then files), each sorted.
 */
export function sortChildren(
  children: TreeChildren,
  filesById: Record<string, CloudFileRecord>,
  foldersById: Record<string, CloudFolderRecord>,
  sortBy: SortBy,
  sortDir: SortDirection,
): TreeChildren {
  const folderNodes = children.folderIds
    .map((id) => foldersById[id])
    .filter(Boolean)
    .map(folderToSortable);

  const fileNodes = children.fileIds
    .map((id) => filesById[id])
    .filter(Boolean)
    .map(fileToSortable);

  const sign = sortDir === "asc" ? 1 : -1;
  folderNodes.sort((a, b) => sign * compareNodes(a, b, sortBy));
  fileNodes.sort((a, b) => sign * compareNodes(a, b, sortBy));

  return {
    folderIds: folderNodes.map((n) => n.id),
    fileIds: fileNodes.map((n) => n.id),
  };
}

// ---------------------------------------------------------------------------
// Search (client-side)
// ---------------------------------------------------------------------------

/**
 * Returns every file whose name or path contains `query` (case-insensitive).
 * Intended for client-side filtering once the tree is loaded.
 */
export function searchFiles(
  filesById: Record<string, CloudFileRecord>,
  query: string,
): CloudFileRecord[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const out: CloudFileRecord[] = [];
  for (const file of Object.values(filesById)) {
    if (file.deletedAt) continue;
    if (
      file.fileName.toLowerCase().includes(needle) ||
      file.filePath.toLowerCase().includes(needle)
    ) {
      out.push(file);
    }
  }
  return out;
}

export function searchFolders(
  foldersById: Record<string, CloudFolderRecord>,
  query: string,
): CloudFolderRecord[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const out: CloudFolderRecord[] = [];
  for (const folder of Object.values(foldersById)) {
    if (folder.deletedAt) continue;
    if (
      folder.folderName.toLowerCase().includes(needle) ||
      folder.folderPath.toLowerCase().includes(needle)
    ) {
      out.push(folder);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tree-building from raw rows (initial hydration)
// ---------------------------------------------------------------------------

export interface BuildTreeInput {
  fileIds: string[];
  folderIds: string[];
  filesById: Record<string, CloudFileRecord>;
  foldersById: Record<string, CloudFolderRecord>;
}

/**
 * Given the normalized file/folder maps, construct the `TreeState` slice
 * (parent → children spine). Files and folders at the true root (no parent)
 * are collected under `rootFolderIds` / `rootFileIds`.
 */
export function buildTreeState(input: BuildTreeInput): TreeState {
  const childrenByFolderId: Record<string, TreeChildren> = {};
  const rootFolderIds: string[] = [];
  const rootFileIds: string[] = [];

  for (const folderId of input.folderIds) {
    const folder = input.foldersById[folderId];
    if (!folder) continue;
    if (folder.parentId) {
      const bucket = (childrenByFolderId[folder.parentId] ??= {
        folderIds: [],
        fileIds: [],
      });
      bucket.folderIds.push(folder.id);
    } else {
      rootFolderIds.push(folder.id);
    }
  }

  for (const fileId of input.fileIds) {
    const file = input.filesById[fileId];
    if (!file || file.deletedAt) continue;
    if (file.parentFolderId) {
      const bucket = (childrenByFolderId[file.parentFolderId] ??= {
        folderIds: [],
        fileIds: [],
      });
      bucket.fileIds.push(file.id);
    } else {
      rootFileIds.push(file.id);
    }
  }

  return {
    rootFolderIds,
    rootFileIds,
    childrenByFolderId,
    fullyLoadedFolderIds: {},
    status: "loaded",
    error: null,
    lastReconciledAt: Date.now(),
  };
}
