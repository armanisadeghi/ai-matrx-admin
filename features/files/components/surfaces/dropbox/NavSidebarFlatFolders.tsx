/**
 * features/files/components/surfaces/dropbox/NavSidebarFlatFolders.tsx
 *
 * Dropbox-style flat folder list for the nav sidebar. Renders root-level
 * folders only with a single level of shallow expand. Clicking a folder
 * navigates — the main pane uses the existing `activeFolderId` flow.
 *
 * Keeps the rendering cheap by reading normalized state directly from the
 * slice; no virtualization needed at this depth.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAllFoldersArray,
  selectChildrenByFolderId,
  selectActiveFolderId,
} from "../../../redux/selectors";
import {
  setActiveFileId,
  setActiveFolderId,
} from "../../../redux/slice";
import { FolderIconWithMembers } from "./FolderIconWithMembers";

export function NavSidebarFlatFolders() {
  const dispatch = useAppDispatch();
  const foldersArray = useAppSelector(selectAllFoldersArray);
  const childrenByFolderId = useAppSelector(selectChildrenByFolderId);
  const activeFolderId = useAppSelector(selectActiveFolderId);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const roots = useMemo(
    () =>
      foldersArray
        .filter((f) => f.parentId === null && !f.deletedAt)
        .sort((a, b) =>
          a.folderName.localeCompare(b.folderName, undefined, {
            sensitivity: "base",
          }),
        ),
    [foldersArray],
  );

  const handleSelect = useCallback(
    (folderId: string) => {
      dispatch(setActiveFolderId(folderId));
      dispatch(setActiveFileId(null));
    },
    [dispatch],
  );

  const handleToggle = useCallback((folderId: string) => {
    setExpanded((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  }, []);

  if (roots.length === 0) {
    return (
      <p className="px-3 py-2 text-[11px] text-muted-foreground">
        Folders will appear here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {roots.map((folder) => {
        const children = childrenByFolderId[folder.id];
        const childFolderIds = children?.folderIds ?? [];
        const hasSubfolders = childFolderIds.length > 0;
        const isOpen = expanded[folder.id] === true;
        const isActive = activeFolderId === folder.id;
        const isShared =
          folder.visibility === "shared" || folder.visibility === "public";
        return (
          <li key={folder.id}>
            <div
              className={cn(
                "group flex items-center gap-1 rounded px-1.5 py-1 text-sm",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-foreground/80 hover:bg-accent/60",
              )}
            >
              <button
                type="button"
                aria-label={isOpen ? "Collapse folder" : "Expand folder"}
                onClick={() => handleToggle(folder.id)}
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded text-muted-foreground",
                  !hasSubfolders && "invisible",
                )}
                tabIndex={hasSubfolders ? 0 : -1}
              >
                <ChevronRight
                  className={cn(
                    "h-3 w-3 transition-transform",
                    isOpen && "rotate-90",
                  )}
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                onClick={() => handleSelect(folder.id)}
                className="flex min-w-0 flex-1 items-center gap-2 truncate text-left"
              >
                <FolderIconWithMembers
                  isShared={isShared}
                  open={isOpen || isActive}
                  size={16}
                />
                <span className="truncate">{folder.folderName}</span>
              </button>
            </div>
            {isOpen && hasSubfolders ? (
              <NestedFolderList
                folderIds={childFolderIds}
                activeFolderId={activeFolderId}
                onSelect={handleSelect}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

interface NestedFolderListProps {
  folderIds: string[];
  activeFolderId: string | null;
  onSelect: (id: string) => void;
}

function NestedFolderList({
  folderIds,
  activeFolderId,
  onSelect,
}: NestedFolderListProps) {
  const foldersById = useAppSelector(
    (s) => s.cloudFiles.foldersById,
  );
  const nested = folderIds
    .map((id) => foldersById[id])
    .filter((f) => f && !f.deletedAt)
    .sort((a, b) =>
      a!.folderName.localeCompare(b!.folderName, undefined, {
        sensitivity: "base",
      }),
    );

  return (
    <ul className="ml-6 flex flex-col border-l border-border/60 pl-1">
      {nested.map((folder) => {
        if (!folder) return null;
        const isActive = activeFolderId === folder.id;
        const isShared =
          folder.visibility === "shared" || folder.visibility === "public";
        return (
          <li key={folder.id}>
            <button
              type="button"
              onClick={() => onSelect(folder.id)}
              className={cn(
                "flex w-full items-center gap-2 truncate rounded px-1.5 py-1 text-left text-sm",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-foreground/80 hover:bg-accent/60",
              )}
            >
              <FolderIconWithMembers
                isShared={isShared}
                open={isActive}
                size={14}
              />
              <span className="truncate">{folder.folderName}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
