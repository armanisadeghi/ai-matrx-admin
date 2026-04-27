/**
 * features/files/components/surfaces/dropbox/FileTableRow.tsx
 *
 * One row inside the Dropbox file table. On hover, reveals the inline action
 * toolbar (Share / Copy link / Star / More). Double-click (or Enter on the
 * name button) activates — files open the preview, folders navigate into.
 */

"use client";

import { forwardRef, useCallback, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Copy, MoreHorizontal, Share2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  CloudFileRecord,
  CloudFolderRecord,
} from "@/features/files/types";
import {
  formatFileSize,
  formatRelativeTime,
} from "@/features/files/utils/format";
import { FileIcon } from "@/features/files/components/core/FileIcon/FileIcon";
import { FileContextMenu } from "@/features/files/components/core/FileContextMenu/FileContextMenu";
import { FolderContextMenu } from "@/features/files/components/core/FolderContextMenu/FolderContextMenu";
import {
  FileRowContextMenu,
  FolderRowContextMenu,
} from "@/features/files/components/core/RowContextMenu/RowContextMenu";
import { useFileActions } from "@/features/files/components/core/FileActions/useFileActions";
import { FolderIconWithMembers } from "./FolderIconWithMembers";
import { AccessBadge } from "./AccessBadge";
import { SharedAvatarStack } from "./SharedAvatarStack";

export interface FileTableRowProps {
  kind: "file" | "folder";
  file?: CloudFileRecord;
  folder?: CloudFolderRecord;
  selected: boolean;
  /** True when this file is currently open in the preview pane. */
  isPreviewActive?: boolean;
  onToggleSelected: () => void;
  onActivate: () => void;
  onOpenShare: () => void;
  isShared: boolean;
  memberCount: number;
  granteeIds: string[];
  /** When set (search mode only), shown as a small breadcrumb under the
   * file/folder name so the user knows which folder this result lives in. */
  parentPath?: string | null;
}

export function FileTableRow(props: FileTableRowProps) {
  if (props.kind === "file" && props.file) {
    return <FileRow {...props} file={props.file} />;
  }
  if (props.kind === "folder" && props.folder) {
    return <FolderRow {...props} folder={props.folder} />;
  }
  return null;
}

interface FileRowProps extends FileTableRowProps {
  file: CloudFileRecord;
}

function FileRow({
  file,
  selected,
  isPreviewActive,
  onToggleSelected,
  onActivate,
  onOpenShare,
  isShared,
  memberCount,
  granteeIds,
  parentPath,
}: FileRowProps) {
  const [hovered, setHovered] = useState(false);
  const actions = useFileActions(file.id);

  const handleCopyLink = useCallback(() => {
    void actions.copyShareUrl();
  }, [actions]);

  // Files are draggable — they can be dropped onto folder rows to move.
  // The drag handle covers the whole row, but the activation distance on
  // the parent DndContext PointerSensor (6px) preserves single-click
  // selection. Drag-listener `data` is what `FileTable.handleDragEnd`
  // reads to know which file was moved where.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `file-${file.id}`,
    data: { type: "file", id: file.id },
  });

  return (
    <FileRowContextMenu fileId={file.id}>
    <tr
      ref={setNodeRef}
      className={cn(
        "group border-b text-sm transition-colors",
        isPreviewActive
          ? "bg-primary/10 border-l-2 border-l-primary"
          : selected
            ? "bg-accent/70"
            : "hover:bg-accent/40",
        isDragging && "opacity-50",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={onActivate}
      {...attributes}
      {...listeners}
    >
      <td className="w-8 px-3 py-2">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelected}
          aria-label={`Select ${file.fileName}`}
        />
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileIcon fileName={file.fileName} size={20} />
          <div className="flex min-w-0 flex-col">
            <button
              type="button"
              onClick={onActivate}
              className="truncate text-left font-medium text-foreground hover:underline"
            >
              {file.fileName}
            </button>
            {parentPath ? (
              <span
                className="truncate text-[11px] text-muted-foreground leading-tight"
                title={`In ${parentPath}`}
              >
                in {parentPath}
              </span>
            ) : null}
          </div>
          <RowActions
            visible={hovered}
            onShare={onOpenShare}
            onCopyLink={handleCopyLink}
            fileId={file.id}
          />
        </div>
      </td>
      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
        {formatRelativeTime(file.updatedAt)}
      </td>
      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
        {formatFileSize(file.fileSize)}
      </td>
      <td className="px-4 py-2 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {isShared && granteeIds.length > 0 ? (
            <SharedAvatarStack granteeIds={granteeIds} max={2} size="sm" />
          ) : null}
          <AccessBadge visibility={file.visibility} memberCount={memberCount} />
        </div>
      </td>
    </tr>
    </FileRowContextMenu>
  );
}

interface FolderRowProps extends FileTableRowProps {
  folder: CloudFolderRecord;
}

function FolderRow({
  folder,
  selected,
  onToggleSelected,
  onActivate,
  isShared,
  memberCount,
  granteeIds,
  onOpenShare,
  parentPath,
}: FolderRowProps) {
  const [hovered, setHovered] = useState(false);

  // Folders are drop targets — files can be dragged here to be moved into
  // them. `isOver` flips while a draggable is hovering, used for the
  // visual highlight (ring). Folder→folder moves are not yet supported by
  // the backend, so folders are NOT draggable in this iteration.
  const { isOver, setNodeRef } = useDroppable({
    id: `folder-${folder.id}`,
    data: { type: "folder", id: folder.id },
  });

  return (
    <FolderRowContextMenu folderId={folder.id}>
    <tr
      ref={setNodeRef}
      className={cn(
        "group border-b text-sm transition-colors",
        selected ? "bg-accent/70" : "hover:bg-accent/40",
        isOver && "bg-primary/10 ring-1 ring-inset ring-primary",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={onActivate}
    >
      <td className="w-8 px-3 py-2">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelected}
          aria-label={`Select ${folder.folderName}`}
        />
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <FolderIconWithMembers isShared={isShared} size={22} />
          <div className="flex min-w-0 flex-col">
            <button
              type="button"
              onClick={onActivate}
              className="truncate text-left font-medium text-foreground hover:underline"
            >
              {folder.folderName}
            </button>
            {parentPath ? (
              <span
                className="truncate text-[11px] text-muted-foreground leading-tight"
                title={`In ${parentPath}`}
              >
                in {parentPath}
              </span>
            ) : null}
          </div>
          <FolderRowActions
            visible={hovered}
            onShare={onOpenShare}
            folderId={folder.id}
          />
        </div>
      </td>
      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">—</td>
      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">—</td>
      <td className="px-4 py-2 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {isShared && granteeIds.length > 0 ? (
            <SharedAvatarStack granteeIds={granteeIds} max={2} size="sm" />
          ) : null}
          <AccessBadge
            visibility={folder.visibility}
            memberCount={memberCount}
          />
        </div>
      </td>
    </tr>
    </FolderRowContextMenu>
  );
}

interface RowActionsProps {
  visible: boolean;
  onShare: () => void;
  onCopyLink: () => void;
  fileId: string;
}

function RowActions({ visible, onShare, onCopyLink, fileId }: RowActionsProps) {
  return (
    <div
      className={cn(
        "ml-auto flex items-center gap-1 pr-1 transition-opacity",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onShare();
        }}
        className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-sm"
      >
        <Share2 className="h-3 w-3" aria-hidden="true" />
        Share
      </button>
      <IconButton
        label="Copy link"
        onClick={(e) => {
          e.stopPropagation();
          onCopyLink();
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton label="Star" title="Coming soon" disabled>
        <Star className="h-3.5 w-3.5" />
      </IconButton>
      <FileContextMenu fileId={fileId}>
        <IconButton
          label="More"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </IconButton>
      </FileContextMenu>
    </div>
  );
}

interface FolderRowActionsProps {
  visible: boolean;
  onShare: () => void;
  folderId: string;
}

function FolderRowActions({
  visible,
  onShare,
  folderId,
}: FolderRowActionsProps) {
  return (
    <div
      className={cn(
        "ml-auto flex items-center gap-1 pr-1 transition-opacity",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onShare();
        }}
        className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-sm"
      >
        <Share2 className="h-3 w-3" aria-hidden="true" />
        Share
      </button>
      <IconButton label="Star" title="Coming soon" disabled>
        <Star className="h-3.5 w-3.5" />
      </IconButton>
      <FolderContextMenu folderId={folderId}>
        <IconButton
          label="More"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </IconButton>
      </FolderContextMenu>
    </div>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: React.ReactNode;
}

/**
 * forwardRef + spread {...rest} is mandatory for use with Radix's
 * `<DropdownMenuTrigger asChild>`. Without ref forwarding Radix can't anchor
 * the menu and click-to-open silently fails on some renders. Without prop
 * spread, Radix's injected `onClick`/`aria-*`/`data-state` props get dropped.
 * Both bugs caused the "..." menu to "not always work".
 */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, title, disabled, className, children, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={title ?? label}
        disabled={disabled}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground",
          "hover:bg-accent hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          disabled && "pointer-events-none opacity-40",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
