"use client";

/**
 * The ONE menu of a file-like record (workbook, document): the row menu in a
 * list and the File menu in an editor are this component. It owns the Share and
 * Move dialogs so they outlive the dropdown that opened them.
 */

import { useState, type ReactNode } from "react";
import { MoreHorizontal, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Button as ToolbarButton } from "@ai-matrx/design-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareModal } from "@/features/sharing/components/ShareModal";
import type { ResourceType } from "@/utils/permissions/types";
import { FileMenuItems, type FileMenuItemsProps } from "./FileMenuItems";
import { MoveToProjectDialog } from "./MoveToProjectDialog";

export type FileMenuProps = Omit<
  FileMenuItemsProps,
  "onShare" | "onMoveRequest"
> & {
  resourceType: ResourceType;
  id: string;
  /** A Share row (and, in lists, a Share button). Editors have Share in their header: false. */
  shareable?: boolean;
  /** A visible Share button next to the menu (list rows). */
  shareButton?: boolean;
  projectId?: string | null;
  onMove?: (
    projectId: string | null,
    projectName: string | null,
  ) => Promise<void> | void;
  /** "icon" is the ⋯ of a list row; "label" is the editor's text "File" button. */
  trigger?: "icon" | "label";
  disabled?: boolean;
};

export function FileMenu({
  resourceType,
  id,
  shareable = true,
  shareButton = false,
  projectId = null,
  onMove,
  trigger = "icon",
  disabled,
  ...items
}: FileMenuProps): ReactNode {
  const [shareOpen, setShareOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const { name, trashed } = items;

  return (
    <span className="matrx-touch-targets flex shrink-0 items-center gap-0.5">
      {shareButton && !trashed && (
        <Button
          icon={<Share2 />}
          aria-label={`Share ${name}`}
          title="Share"
          variant="quiet"
          disabled={disabled}
          onClick={() => setShareOpen(true)}
        />
      )}
      {/* In Trash only the owner can act (Restore); anyone else would open an empty menu. */}
      {!(trashed && !items.canManage) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {trigger === "label" ? (
              <ToolbarButton
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                title="File"
                disabled={disabled}
              >
                File
              </ToolbarButton>
            ) : (
              <Button
                icon={<MoreHorizontal />}
                aria-label={`Actions for ${name}`}
                title="More actions"
                variant="quiet"
                disabled={disabled}
              />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[11rem]">
            <FileMenuItems
              {...items}
              {...(shareable ? { onShare: () => setShareOpen(true) } : {})}
              {...(onMove ? { onMoveRequest: () => setMoveOpen(true) } : {})}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {shareOpen && (
        <ShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          resourceType={resourceType}
          resourceId={id}
          resourceName={name}
        />
      )}
      {moveOpen && onMove && (
        <MoveToProjectDialog
          name={name}
          currentProjectId={projectId}
          onClose={() => setMoveOpen(false)}
          onMove={onMove}
        />
      )}
    </span>
  );
}
