/**
 * features/files/components/surfaces/dropbox/FileTableRow.tsx
 *
 * One row inside the Dropbox file table. On hover, reveals the inline action
 * toolbar (Share / Copy link / Star / More). Double-click (or Enter on the
 * name button) activates — files open the preview, folders navigate into.
 */

"use client";

import { forwardRef, useCallback, useState } from "react";
import { Copy, MoreHorizontal, Share2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { CloudFileRecord, CloudFolderRecord } from "../../../types";
import {
  formatFileSize,
  formatRelativeTime,
} from "../../../utils/format";
import { FileIcon } from "../../core/FileIcon";
import { FileContextMenu } from "../../core/FileContextMenu";
import { useFileActions } from "../../core/FileActions";
import { FolderIconWithMembers } from "./FolderIconWithMembers";
import { AccessBadge } from "./AccessBadge";
import { SharedAvatarStack } from "./SharedAvatarStack";

export interface FileTableRowProps {
  kind: "file" | "folder";
  file?: CloudFileRecord;
  folder?: CloudFolderRecord;
  selected: boolean;
  onToggleSelected: () => void;
  onActivate: () => void;
  onOpenShare: () => void;
  isShared: boolean;
  memberCount: number;
  granteeIds: string[];
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
  onToggleSelected,
  onActivate,
  onOpenShare,
  isShared,
  memberCount,
  granteeIds,
}: FileRowProps) {
  const [hovered, setHovered] = useState(false);
  const actions = useFileActions(file.id);

  const handleCopyLink = useCallback(() => {
    void actions.copyShareUrl();
  }, [actions]);

  return (
    <tr
      className={cn(
        "group border-b text-sm transition-colors",
        selected ? "bg-accent/70" : "hover:bg-accent/40",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={onActivate}
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
          <button
            type="button"
            onClick={onActivate}
            className="truncate text-left font-medium text-foreground hover:underline"
          >
            {file.fileName}
          </button>
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
            <SharedAvatarStack
              granteeIds={granteeIds}
              max={2}
              size="sm"
            />
          ) : null}
          <AccessBadge
            visibility={file.visibility}
            memberCount={memberCount}
          />
        </div>
      </td>
    </tr>
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
}: FolderRowProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      className={cn(
        "group border-b text-sm transition-colors",
        selected ? "bg-accent/70" : "hover:bg-accent/40",
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
          <button
            type="button"
            onClick={onActivate}
            className="truncate text-left font-medium text-foreground hover:underline"
          >
            {folder.folderName}
          </button>
          <FolderRowActions
            visible={hovered}
            onShare={onOpenShare}
          />
        </div>
      </td>
      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
        —
      </td>
      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
        —
      </td>
      <td className="px-4 py-2 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {isShared && granteeIds.length > 0 ? (
            <SharedAvatarStack
              granteeIds={granteeIds}
              max={2}
              size="sm"
            />
          ) : null}
          <AccessBadge
            visibility={folder.visibility}
            memberCount={memberCount}
          />
        </div>
      </td>
    </tr>
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
}

function FolderRowActions({ visible, onShare }: FolderRowActionsProps) {
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
    </div>
  );
}

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
  function IconButton({ label, title, disabled, className, children, ...rest }, ref) {
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
