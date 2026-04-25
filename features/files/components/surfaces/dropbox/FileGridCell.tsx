/**
 * features/files/components/surfaces/dropbox/FileGridCell.tsx
 *
 * One cell in the Dropbox-style grid view. Shows an image thumbnail when the
 * file is an image (via `useSignedUrl`), else a large file icon. Filename +
 * "EXT • size" meta line underneath, matching the Dropbox layout.
 */

"use client";

import { useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Copy, MoreHorizontal, Share2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useSignedUrl } from "../../../hooks/useSignedUrl";
import {
  formatFileSize,
} from "../../../utils/format";
import { FileIcon } from "../../core/FileIcon";
import { FileContextMenu } from "../../core/FileContextMenu";
import { useFileActions } from "../../core/FileActions";
import type { CloudFileRecord, CloudFolderRecord } from "../../../types";
import { FolderIconWithMembers } from "./FolderIconWithMembers";

export interface FileGridCellProps {
  kind: "file" | "folder";
  file?: CloudFileRecord;
  folder?: CloudFolderRecord;
  selected: boolean;
  isShared: boolean;
  onToggleSelected: () => void;
  onActivate: () => void;
  onOpenShare: () => void;
  /** Search-mode breadcrumb under the cell title — when null/undefined the
   * cell renders its existing meta line (ext • size). */
  parentPath?: string | null;
}

export function FileGridCell(props: FileGridCellProps) {
  if (props.kind === "file" && props.file) {
    return <GridFile {...props} file={props.file} />;
  }
  if (props.kind === "folder" && props.folder) {
    return <GridFolder {...props} folder={props.folder} />;
  }
  return null;
}

interface GridFileProps extends FileGridCellProps {
  file: CloudFileRecord;
}

function GridFile({
  file,
  selected,
  isShared,
  onToggleSelected,
  onActivate,
  onOpenShare,
  parentPath,
}: GridFileProps) {
  const [hovered, setHovered] = useState(false);
  const actions = useFileActions(file.id);
  const isImage = (file.mimeType ?? "").toLowerCase().startsWith("image/");
  const { url } = useSignedUrl(isImage ? file.id : null, { expiresIn: 3600 });
  const ext = file.fileName.split(".").pop()?.toUpperCase() ?? "FILE";

  // File cells are draggable. The activation distance on the parent
  // PointerSensor (6px) preserves single-click selection.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `grid-file-${file.id}`,
    data: { type: "file", id: file.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group flex flex-col rounded-lg border bg-card overflow-hidden transition-shadow",
        selected && "ring-2 ring-ring",
        "hover:shadow-sm",
        isDragging && "opacity-50",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={onActivate}
      {...attributes}
      {...listeners}
    >
      <div className="relative aspect-[4/3] bg-muted/50">
        {isImage && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={file.fileName}
            loading="lazy"
            className="h-full w-full object-cover"
            onClick={onActivate}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            onClick={onActivate}
          >
            <FileIcon fileName={file.fileName} size={48} />
          </div>
        )}

        <div className="absolute left-2 top-2">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelected}
            aria-label={`Select ${file.fileName}`}
            className={cn(
              "bg-background/90 backdrop-blur",
              selected ? "opacity-100" : hovered ? "opacity-100" : "opacity-0",
            )}
          />
        </div>

        <div
          className={cn(
            "absolute right-2 top-2 flex items-center gap-1 transition-opacity",
            hovered ? "opacity-100" : "opacity-0",
          )}
        >
          <GridIconButton
            label="Share"
            onClick={(e) => {
              e.stopPropagation();
              onOpenShare();
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
          </GridIconButton>
          <GridIconButton
            label="Copy link"
            onClick={(e) => {
              e.stopPropagation();
              void actions.copyShareUrl();
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </GridIconButton>
          <GridIconButton label="Star" title="Coming soon" disabled>
            <Star className="h-3.5 w-3.5" />
          </GridIconButton>
          <FileContextMenu fileId={file.id}>
            <GridIconButton label="More">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </GridIconButton>
          </FileContextMenu>
        </div>
      </div>

      <div className="px-3 py-2">
        <p className="truncate text-sm font-medium">{file.fileName}</p>
        {parentPath ? (
          <p
            className="truncate text-xs text-muted-foreground"
            title={`In ${parentPath}`}
          >
            in {parentPath}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {ext} • {formatFileSize(file.fileSize)}
          </p>
        )}
      </div>

      {isShared ? (
        <div className="absolute bottom-2 right-2 pointer-events-none opacity-70">
          <FolderIconWithMembers isShared size={12} />
        </div>
      ) : null}
    </div>
  );
}

interface GridFolderProps extends FileGridCellProps {
  folder: CloudFolderRecord;
}

function GridFolder({
  folder,
  selected,
  isShared,
  onToggleSelected,
  onActivate,
  onOpenShare,
  parentPath,
}: GridFolderProps) {
  const [hovered, setHovered] = useState(false);

  // Folder cells are drop targets. `isOver` highlights the cell while a
  // file is being dragged over it.
  const { isOver, setNodeRef } = useDroppable({
    id: `grid-folder-${folder.id}`,
    data: { type: "folder", id: folder.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group flex flex-col rounded-lg border bg-card overflow-hidden transition-shadow",
        selected && "ring-2 ring-ring",
        "hover:shadow-sm",
        isOver && "ring-2 ring-primary bg-primary/5",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={onActivate}
    >
      <div
        className="relative aspect-[4/3] bg-primary/5 flex items-center justify-center"
        onClick={onActivate}
      >
        <FolderIconWithMembers isShared={isShared} size={56} />

        <div className="absolute left-2 top-2">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelected}
            aria-label={`Select ${folder.folderName}`}
            className={cn(
              "bg-background/90 backdrop-blur",
              selected ? "opacity-100" : hovered ? "opacity-100" : "opacity-0",
            )}
          />
        </div>

        <div
          className={cn(
            "absolute right-2 top-2 flex items-center gap-1 transition-opacity",
            hovered ? "opacity-100" : "opacity-0",
          )}
        >
          <GridIconButton
            label="Share"
            onClick={(e) => {
              e.stopPropagation();
              onOpenShare();
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
          </GridIconButton>
          <GridIconButton label="Star" title="Coming soon" disabled>
            <Star className="h-3.5 w-3.5" />
          </GridIconButton>
        </div>
      </div>

      <div className="px-3 py-2">
        <p className="truncate text-sm font-medium">{folder.folderName}</p>
        {parentPath ? (
          <p
            className="truncate text-xs text-muted-foreground"
            title={`In ${parentPath}`}
          >
            in {parentPath}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Folder</p>
        )}
      </div>
    </div>
  );
}

interface GridIconButtonProps {
  label: string;
  title?: string;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}

function GridIconButton({
  label,
  title,
  disabled,
  onClick,
  children,
}: GridIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md bg-background/90 text-muted-foreground backdrop-blur",
        "hover:bg-background hover:text-foreground",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {children}
    </button>
  );
}
