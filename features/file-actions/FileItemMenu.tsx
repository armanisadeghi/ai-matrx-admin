"use client";

/**
 * The ONE per-item action layer for file-like records (workbooks, documents):
 * Share, Rename, Make a copy, Star, Move to trash / Restore. Lists and editors
 * mount this; neither re-implements a sharing, star, copy or trash path.
 */

import { useState } from "react";
import {
  ArchiveRestore,
  Copy,
  ExternalLink,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Share2,
  Star,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareModal } from "@/features/sharing/components/ShareModal";
import { promptForValues } from "@/components/dialogs/value-prompts/ValuePromptsDialogHost";
import type { ResourceType } from "@/utils/permissions/types";

export type FileItemMenuProps = {
  resourceType: ResourceType;
  id: string;
  name: string;
  /** Where the item opens; enables "Open in new tab". */
  href?: string;
  /** Owner (or Admin): sees Rename, Move and Move to trash. */
  canManage: boolean;
  starred: boolean;
  trashed?: boolean;
  onToggleStar: () => void;
  onRename?: (name: string) => Promise<void> | void;
  onCopy?: () => Promise<void> | void;
  onMove?: () => Promise<void> | void;
  onTrash?: () => Promise<void> | void;
  onRestore?: () => Promise<void> | void;
  disabled?: boolean;
};

export function FileItemMenu({
  resourceType,
  id,
  name,
  href,
  canManage,
  starred,
  trashed = false,
  onToggleStar,
  onRename,
  onCopy,
  onMove,
  onTrash,
  onRestore,
  disabled,
}: FileItemMenuProps) {
  const [shareOpen, setShareOpen] = useState(false);

  const rename = async () => {
    if (!onRename) return;
    const answers = await promptForValues({
      title: "Rename",
      submitLabel: "Rename",
      fields: [{ name: "name", prompt: "Name", defaultValue: name, required: true }],
    });
    const next = answers?.name?.trim();
    if (next && next !== name) await onRename(next);
  };

  return (
    <span className="matrx-touch-targets flex shrink-0 items-center gap-0.5">
      {!trashed && (
        <Button
          icon={<Share2 />}
          aria-label={`Share ${name}`}
          title="Share"
          variant="quiet"
          disabled={disabled}
          onClick={() => setShareOpen(true)}
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            icon={<MoreHorizontal />}
            aria-label={`Actions for ${name}`}
            title="More actions"
            variant="quiet"
            disabled={disabled}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[11rem]">
          {trashed ? (
            onRestore && (
              <DropdownMenuItem onSelect={() => void onRestore()}>
                <ArchiveRestore className="mr-2 size-4" />
                Restore
              </DropdownMenuItem>
            )
          ) : (
            <>
              <DropdownMenuItem onSelect={() => setShareOpen(true)}>
                <Share2 className="mr-2 size-4" />
                Share
              </DropdownMenuItem>
              {href && (
                <DropdownMenuItem
                  onSelect={() => window.open(href, "_blank", "noopener")}
                >
                  <ExternalLink className="mr-2 size-4" />
                  Open in new tab
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={onToggleStar}>
                <Star
                  className={`mr-2 size-4 ${starred ? "fill-current text-amber-500" : ""}`}
                />
                {starred ? "Remove star" : "Star"}
              </DropdownMenuItem>
              {canManage && onRename && (
                <DropdownMenuItem onSelect={() => void rename()}>
                  <Pencil className="mr-2 size-4" />
                  Rename
                </DropdownMenuItem>
              )}
              {onCopy && (
                <DropdownMenuItem onSelect={() => void onCopy()}>
                  <Copy className="mr-2 size-4" />
                  Make a copy
                </DropdownMenuItem>
              )}
              {canManage && onMove && (
                <DropdownMenuItem onSelect={() => void onMove()}>
                  <FolderInput className="mr-2 size-4" />
                  Move
                </DropdownMenuItem>
              )}
              {canManage && onTrash && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => void onTrash()}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Move to trash
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {shareOpen && (
        <ShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          resourceType={resourceType}
          resourceId={id}
          resourceName={name}
        />
      )}
    </span>
  );
}
