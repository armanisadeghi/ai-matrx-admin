/**
 * features/files/components/surfaces/dropbox/FileGrid.tsx
 *
 * Card-grid view of files and folders — matches the second Dropbox screenshot
 * (thumbnails with file name + "EXT • size" meta line). Shares filtering
 * logic with FileTable via `row-data.buildRows`.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectSelection } from "../../../redux/selectors";
import {
  setActiveFileId,
  setActiveFolderId,
  toggleSelection,
} from "../../../redux/slice";
import { ShareLinkDialog } from "../../core/ShareLinkDialog";
import type {
  CloudFilePermission,
  CloudFileRecord,
  CloudFolderRecord,
} from "../../../types";
import { FileGridCell } from "./FileGridCell";
import { buildRows, isSharedResource } from "./row-data";
import type { FilterChipKey } from "./FilterChips";
import type { CloudFilesSection } from "./section";

export interface FileGridProps {
  folders: CloudFolderRecord[];
  files: CloudFileRecord[];
  permissionsByResourceId: Record<string, CloudFilePermission[]>;
  section: CloudFilesSection;
  searchQuery: string;
  filter: FilterChipKey | null;
  onActivateFolder: (folderId: string) => void;
  onActivateFile: (fileId: string) => void;
  className?: string;
}

interface ShareDialogState {
  resourceId: string;
  resourceType: "file" | "folder";
}

export function FileGrid({
  folders,
  files,
  permissionsByResourceId,
  section,
  searchQuery,
  filter,
  onActivateFolder,
  onActivateFile,
  className,
}: FileGridProps) {
  const dispatch = useAppDispatch();
  const selection = useAppSelector(selectSelection);

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

  const [shareTarget, setShareTarget] = useState<ShareDialogState | null>(null);

  const handleActivate = useCallback(
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

  if (rows.length === 0) {
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
      className={cn(
        "h-full w-full overflow-auto p-4",
        className,
      )}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {rows.map((row) => {
          const id = row.kind === "file" ? row.file.id : row.folder.id;
          const visibility =
            row.kind === "file"
              ? row.file.visibility
              : row.folder.visibility;
          const isShared = isSharedResource(
            id,
            visibility,
            permissionsByResourceId,
          );
          const selected = selection.selectedIds.includes(id);
          return (
            <FileGridCell
              key={id}
              kind={row.kind}
              file={row.kind === "file" ? row.file : undefined}
              folder={row.kind === "folder" ? row.folder : undefined}
              selected={selected}
              isShared={isShared}
              onToggleSelected={() =>
                dispatch(toggleSelection({ id }))
              }
              onActivate={() => handleActivate(row)}
              onOpenShare={() =>
                setShareTarget({
                  resourceId: id,
                  resourceType: row.kind,
                })
              }
            />
          );
        })}
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
