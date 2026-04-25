/**
 * features/files/components/surfaces/dropbox/row-data.ts
 *
 * Shared helpers for shaping file/folder records into "row view models" used
 * by the Dropbox file table and grid. Keeps components dumb — this is where
 * filtering and sorting live.
 */

"use client";

import type {
  CloudFileRecord,
  CloudFolderRecord,
  CloudFilePermission,
} from "@/features/files/types";
import type { CloudFilesSection } from "./section";
import type { FilterChipKey } from "./FilterChips";

export type RowItem =
  | { kind: "folder"; folder: CloudFolderRecord }
  | { kind: "file"; file: CloudFileRecord };

export interface BuildRowsArg {
  folders: CloudFolderRecord[];
  files: CloudFileRecord[];
  section: CloudFilesSection;
  searchQuery: string;
  filter: FilterChipKey | null;
  permissionsByResourceId: Record<string, CloudFilePermission[]>;
}

export function buildRows({
  folders,
  files,
  section,
  searchQuery,
  filter,
  permissionsByResourceId,
}: BuildRowsArg): RowItem[] {
  const q = searchQuery.trim().toLowerCase();
  const matchesQuery = (name: string) =>
    !q || name.toLowerCase().includes(q);

  // Section filters — applied to files only unless noted.
  const filterFiles = (file: CloudFileRecord): boolean => {
    if (file.deletedAt && section !== "trash") return false;
    if (!file.deletedAt && section === "trash") return false;

    if (section === "photos") {
      const mime = (file.mimeType ?? "").toLowerCase();
      if (!mime.startsWith("image/")) return false;
    }
    if (section === "shared") {
      const perms = permissionsByResourceId[file.id];
      const hasGrants = perms && perms.length > 0;
      const isPublic = file.visibility === "public";
      const isShared = file.visibility === "shared";
      if (!(hasGrants || isPublic || isShared)) return false;
    }
    return matchesQuery(file.fileName);
  };

  const filterFolders = (folder: CloudFolderRecord): boolean => {
    if (folder.deletedAt && section !== "trash") return false;
    if (!folder.deletedAt && section === "trash") return false;
    if (section === "photos") return false; // photos view never shows folders
    if (section === "shared") {
      const perms = permissionsByResourceId[folder.id];
      const hasGrants = perms && perms.length > 0;
      const isPublic = folder.visibility === "public";
      const isShared = folder.visibility === "shared";
      if (!(hasGrants || isPublic || isShared)) return false;
    }
    return matchesQuery(folder.folderName);
  };

  const folderRows = folders
    .filter(filterFolders)
    .map<RowItem>((folder) => ({ kind: "folder", folder }));
  const fileRows = files
    .filter(filterFiles)
    .map<RowItem>((file) => ({ kind: "file", file }));

  let rows: RowItem[] = [...folderRows, ...fileRows];

  // Filter chip: Recents → sort by updatedAt desc; Starred → empty (placeholder).
  if (filter === "recents") {
    rows = [...rows].sort((a, b) => {
      const aDate = a.kind === "file" ? a.file.updatedAt : a.folder.updatedAt;
      const bDate = b.kind === "file" ? b.file.updatedAt : b.folder.updatedAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  } else if (filter === "starred") {
    rows = [];
  }

  return rows;
}

export function memberCountForResource(
  resourceId: string,
  permissionsByResourceId: Record<string, CloudFilePermission[]>,
): number {
  const perms = permissionsByResourceId[resourceId];
  if (!perms || perms.length === 0) return 0;
  const unique = new Set(perms.map((p) => p.granteeId));
  return unique.size;
}

export function isSharedResource(
  resourceId: string,
  visibility: "public" | "private" | "shared",
  permissionsByResourceId: Record<string, CloudFilePermission[]>,
): boolean {
  if (visibility === "shared" || visibility === "public") return true;
  const perms = permissionsByResourceId[resourceId];
  return !!perms && perms.length > 0;
}
