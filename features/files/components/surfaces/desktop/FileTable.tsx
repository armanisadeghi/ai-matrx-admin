/**
 * features/files/components/surfaces/dropbox/FileTable.tsx
 *
 * Dropbox-style sortable file table. Columns: Name / Last modified / Size /
 * Access — plus a leading checkbox for row selection.
 *
 * Sort state lives in redux (`cloudFiles.ui.sortBy/sortDir`); this component
 * is responsible only for rendering + dispatch.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveFileId,
  selectAllFoldersMap,
  selectSelection,
  selectSort,
} from "@/features/files/redux/selectors";
import {
  clearSelection,
  setActiveFileId,
  setActiveFolderId,
  setSelection,
  setSort,
  toggleSelection,
} from "@/features/files/redux/slice";
import type {
  CloudFilePermission,
  CloudFileRecord,
  CloudFolderRecord,
  SortBy,
} from "@/features/files/types";
import { ShareLinkDialog } from "@/features/files/components/core/ShareLinkDialog/ShareLinkDialog";
import type { CloudFilesSection } from "./section";
import {
  buildRows,
  isSharedResource,
  memberCountForResource,
} from "./row-data";
import type { FilterChipKey } from "./FilterChips";
import { FileTableRow } from "./FileTableRow";

export interface FileTableProps {
  folders: CloudFolderRecord[];
  files: CloudFileRecord[];
  permissionsByResourceId: Record<string, CloudFilePermission[]>;
  section: CloudFilesSection;
  searchQuery: string;
  filter: FilterChipKey | null;
  /** True when `folders` + `files` represent the entire tree (search mode),
   * not just the active folder. Drives the "Showing results from all folders"
   * banner and the per-row breadcrumb that disambiguates results. */
  treeWideSearch?: boolean;
  onActivateFolder: (folderId: string) => void;
  onActivateFile: (fileId: string) => void;
  emptyState?: React.ReactNode;
  className?: string;
}

interface ShareDialogState {
  resourceId: string;
  resourceType: "file" | "folder";
}

export function FileTable({
  folders,
  files,
  permissionsByResourceId,
  section,
  searchQuery,
  filter,
  treeWideSearch = false,
  onActivateFolder,
  onActivateFile,
  emptyState,
  className,
}: FileTableProps) {
  const dispatch = useAppDispatch();
  const selection = useAppSelector(selectSelection);
  const activeFileId = useAppSelector(selectActiveFileId);
  const { sortBy, sortDir } = useAppSelector(selectSort);
  // Used to render parent-folder breadcrumbs on each row in search mode so
  // identically-named files in different folders are unambiguous.
  const foldersById = useAppSelector(selectAllFoldersMap);

  const rows = useMemo(
    () =>
      buildRows({
        folders,
        files,
        section,
        searchQuery,
        filter,
        permissionsByResourceId,
      }),
    [folders, files, section, searchQuery, filter, permissionsByResourceId],
  );

  // Resolve "Parent/Child" path for a given folder id. Cached per-render via
  // `useCallback` + `Map`; folder hierarchies are typically <5 levels deep so
  // the recursion cost is negligible.
  const resolveFolderPath = useCallback(
    (folderId: string | null): string => {
      if (!folderId) return "/";
      const segments: string[] = [];
      let cursor: string | null = folderId;
      // Defensive cycle guard — depth cap prevents infinite loops if the tree
      // is corrupted.
      let depth = 0;
      while (cursor && depth < 32) {
        const folder = foldersById[cursor];
        if (!folder) break;
        segments.unshift(folder.folderName);
        cursor = folder.parentId;
        depth += 1;
      }
      return segments.length ? segments.join(" / ") : "/";
    },
    [foldersById],
  );

  const [shareTarget, setShareTarget] = useState<ShareDialogState | null>(null);

  const allIds = useMemo(
    () => rows.map((r) => (r.kind === "file" ? r.file.id : r.folder.id)),
    [rows],
  );
  const allSelected =
    allIds.length > 0 &&
    allIds.every((id) => selection.selectedIds.includes(id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      dispatch(clearSelection());
    } else {
      dispatch(setSelection({ selectedIds: allIds, anchorId: null }));
    }
  }, [dispatch, allIds, allSelected]);

  const handleRowActivate = useCallback(
    (row: (typeof rows)[number]) => {
      if (row.kind === "folder") {
        dispatch(setActiveFolderId(row.folder.id));
        dispatch(setActiveFileId(null));
        onActivateFolder(row.folder.id);
      } else {
        dispatch(setActiveFileId(row.file.id));
        onActivateFile(row.file.id);
      }
    },
    [dispatch, onActivateFolder, onActivateFile],
  );

  // Drag-and-drop is wired at the PageShell level so files dragged from
  // this table can also be dropped onto NavSidebar folders, not just rows
  // within this table. We just contribute draggable/droppable nodes here.

  if (rows.length === 0) {
    if (treeWideSearch) {
      return (
        <div
          className={cn(
            "flex h-full w-full flex-col items-center justify-center gap-2 p-8 text-center",
            className,
          )}
        >
          <SearchIcon className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            No matches for &ldquo;{searchQuery}&rdquo;
          </p>
          <p className="text-xs text-muted-foreground">
            Tried searching across all folders.
          </p>
        </div>
      );
    }
    if (emptyState) {
      return <div className={cn("h-full w-full", className)}>{emptyState}</div>;
    }
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center p-8 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {filter === "starred"
          ? "Starred items will appear here."
          : "No files yet. Use the + New button or drop files to upload."}
      </div>
    );
  }

  return (
    <div
      className={cn("flex h-full w-full flex-col overflow-hidden", className)}
    >
      {treeWideSearch ? (
        <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground shrink-0">
          <SearchIcon className="h-3.5 w-3.5" />
          <span>
            Showing {rows.length} {rows.length === 1 ? "result" : "results"}{" "}
            from all folders for &ldquo;
            <span className="font-medium text-foreground">{searchQuery}</span>
            &rdquo;
          </span>
        </div>
      ) : null}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-8 px-2 py-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <SortableHeader
                label="Name"
                sortKey="name"
                activeSortBy={sortBy}
                activeSortDir={sortDir}
                onChange={(next) => dispatch(setSort(next))}
              />
              <SortableHeader
                label="Last modified"
                sortKey="updated_at"
                activeSortBy={sortBy}
                activeSortDir={sortDir}
                onChange={(next) => dispatch(setSort(next))}
                align="left"
              />
              <SortableHeader
                label="Size"
                sortKey="size"
                activeSortBy={sortBy}
                activeSortDir={sortDir}
                onChange={(next) => dispatch(setSort(next))}
                align="left"
              />
              <th className="px-4 py-2 text-left font-medium">Access</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = row.kind === "file" ? row.file.id : row.folder.id;
              const visibility =
                row.kind === "file"
                  ? row.file.visibility
                  : row.folder.visibility;
              const perms = permissionsByResourceId[id] ?? [];
              const granteeIds = perms.map((p) => p.granteeId);
              const memberCount = memberCountForResource(
                id,
                permissionsByResourceId,
              );
              const isShared = isSharedResource(
                id,
                visibility,
                permissionsByResourceId,
              );
              const selected = selection.selectedIds.includes(id);
              const isPreviewActive =
                row.kind === "file" && row.file.id === activeFileId;
              // In search mode, surface where each match lives so identically
              // named files in different folders aren't ambiguous.
              const parentFolderId =
                row.kind === "file"
                  ? row.file.parentFolderId
                  : row.folder.parentId;
              const parentPath = treeWideSearch
                ? resolveFolderPath(parentFolderId ?? null)
                : null;
              return (
                <FileTableRow
                  key={id}
                  kind={row.kind}
                  file={row.kind === "file" ? row.file : undefined}
                  folder={row.kind === "folder" ? row.folder : undefined}
                  selected={selected}
                  isPreviewActive={isPreviewActive}
                  onToggleSelected={() => dispatch(toggleSelection({ id }))}
                  onActivate={() => handleRowActivate(row)}
                  onOpenShare={() =>
                    setShareTarget({
                      resourceId: id,
                      resourceType: row.kind,
                    })
                  }
                  isShared={isShared}
                  memberCount={memberCount}
                  granteeIds={granteeIds}
                  parentPath={parentPath}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {shareTarget ? (
        <ShareLinkDialog
          open={!!shareTarget}
          onOpenChange={(open) => {
            if (!open) setShareTarget(null);
          }}
          resourceId={shareTarget.resourceId}
          resourceType={shareTarget.resourceType}
        />
      ) : null}
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  sortKey: SortBy;
  activeSortBy: SortBy;
  activeSortDir: "asc" | "desc";
  onChange: (arg: { sortBy: SortBy; sortDir: "asc" | "desc" }) => void;
  align?: "left" | "right";
}

function SortableHeader({
  label,
  sortKey,
  activeSortBy,
  activeSortDir,
  onChange,
  align = "left",
}: SortableHeaderProps) {
  const isActive = activeSortBy === sortKey;
  return (
    <th
      className={cn(
        "px-4 py-2 font-medium whitespace-nowrap",
        align === "left" ? "text-left" : "text-right",
      )}
    >
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          isActive && "text-foreground",
        )}
        onClick={() => {
          if (isActive) {
            onChange({
              sortBy: sortKey,
              sortDir: activeSortDir === "asc" ? "desc" : "asc",
            });
          } else {
            onChange({ sortBy: sortKey, sortDir: "asc" });
          }
        }}
      >
        {label}
        {isActive ? (
          activeSortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </button>
    </th>
  );
}
