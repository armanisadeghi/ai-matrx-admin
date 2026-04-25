/**
 * features/files/components/surfaces/dropbox/ContentHeader.tsx
 *
 * Header block above the file table — breadcrumbs, folder title + gear
 * (opens permissions dialog), right-hand action buttons (Upload, New folder,
 * Open app, Share folder), member avatars + access badge, and the filter
 * chips / view-mode toggle row below.
 *
 * Kept deliberately dumb — state lives with the parent shell; this is pure
 * composition.
 */

"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Settings2, Share2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAllFoldersMap,
  selectPermissionsForResource,
  selectActiveShareLinksForResource,
  EMPTY_CLOUD_FILE_PERMISSIONS,
} from "@/features/files/redux/selectors";
import {
  setActiveFileId,
  setActiveFolderId,
} from "@/features/files/redux/slice";
import { FileBreadcrumbs } from "@/features/files/components/core/FileBreadcrumbs/FileBreadcrumbs";
import { PermissionsDialog } from "@/features/files/components/core/PermissionsDialog/PermissionsDialog";
import { ShareLinkDialog } from "@/features/files/components/core/ShareLinkDialog/ShareLinkDialog";
import type { Visibility } from "@/features/files/types";
import { AccessBadge } from "./AccessBadge";
import { SharedAvatarStack } from "./SharedAvatarStack";
import { FilterChips } from "./FilterChips";
import type { FilterChipKey } from "./FilterChips";
import { ViewModeToggle } from "./ViewModeToggle";
import { NewMenu } from "./NewMenu";
import type { CloudFilesSection } from "./section";

const SECTION_TITLES: Record<CloudFilesSection, string> = {
  all: "All files",
  folders: "Folders",
  "folders-root": "Folders",
  photos: "Photos",
  shared: "Shared",
  requests: "File requests",
  trash: "Deleted files",
  starred: "Starred",
  activity: "Activity",
};

export interface ContentHeaderProps {
  section: CloudFilesSection;
  activeFolderId: string | null;
  activeFilter: FilterChipKey | null;
  onFilterToggle: (key: FilterChipKey) => void;
  showActions?: boolean;
  showFilterRow?: boolean;
  className?: string;
}

export function ContentHeader({
  section,
  activeFolderId,
  activeFilter,
  onFilterToggle,
  showActions = true,
  showFilterRow = true,
  className,
}: ContentHeaderProps) {
  const dispatch = useAppDispatch();
  const foldersById = useAppSelector(selectAllFoldersMap);
  const folder = activeFolderId ? foldersById[activeFolderId] : null;
  const permissions = useAppSelector((s) =>
    activeFolderId
      ? selectPermissionsForResource(s, activeFolderId)
      : undefined,
  );
  const shareLinks = useAppSelector((s) =>
    activeFolderId
      ? selectActiveShareLinksForResource(s, activeFolderId)
      : undefined,
  );

  const title = folder?.folderName ?? SECTION_TITLES[section];
  const visibility: Visibility = folder?.visibility ?? "private";
  const granteeIds = useMemo(
    () => (permissions ?? EMPTY_CLOUD_FILE_PERMISSIONS).map((p) => p.granteeId),
    [permissions],
  );
  const memberCount = useMemo(() => new Set(granteeIds).size, [granteeIds]);

  const [permsOpen, setPermsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const handleNavigate = (folderId: string | null) => {
    dispatch(setActiveFolderId(folderId));
    dispatch(setActiveFileId(null));
  };

  const handleOpenShareLink = async () => {
    if (!activeFolderId) return;
    const link = shareLinks?.[0];
    if (!link) {
      setShareOpen(true);
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    window.open(`${origin}/share/${link.shareToken}`, "_blank");
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border/70 bg-background px-4 py-3 shrink-0",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <FileBreadcrumbs
          folderId={folder ? folder.id : null}
          onNavigate={handleNavigate}
          className="text-xs"
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {title}
            </h1>
            {folder ? (
              <button
                type="button"
                aria-label="Folder settings"
                onClick={() => setPermsOpen(true)}
                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Settings2 className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {showActions ? (
            <div className="flex items-center gap-2">
              <NewMenu parentFolderId={activeFolderId} />
              <HeaderButton
                onClick={() =>
                  document
                    .querySelector<HTMLInputElement>(
                      'input[type="file"][multiple]',
                    )
                    ?.click()
                }
                label="Upload"
                icon={<Upload className="h-4 w-4" />}
              />
              {folder ? (
                <HeaderButton
                  onClick={() => void handleOpenShareLink()}
                  label="Open app"
                  icon={<ExternalLink className="h-4 w-4" />}
                />
              ) : null}
              {folder ? (
                <HeaderButton
                  onClick={() => setShareOpen(true)}
                  label="Share folder"
                  icon={<Share2 className="h-4 w-4" />}
                  variant="primary"
                />
              ) : null}
              {folder ? (
                <div className="flex items-center gap-2 pl-2">
                  <SharedAvatarStack granteeIds={granteeIds} max={3} />
                  <AccessBadge
                    visibility={visibility}
                    memberCount={memberCount}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {showFilterRow ? (
        <div className="flex items-center justify-between gap-3">
          <FilterChips active={activeFilter} onToggle={onFilterToggle} />
          <ViewModeToggle />
        </div>
      ) : null}

      {folder ? (
        <>
          <PermissionsDialog
            open={permsOpen}
            onOpenChange={setPermsOpen}
            resourceId={folder.id}
            resourceType="folder"
          />
          <ShareLinkDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            resourceId={folder.id}
            resourceType="folder"
          />
        </>
      ) : null}
    </div>
  );
}

interface HeaderButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "primary";
}

function HeaderButton({
  label,
  icon,
  onClick,
  variant = "default",
}: HeaderButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm",
        variant === "primary"
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          : "border-border bg-background text-foreground hover:bg-accent",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
