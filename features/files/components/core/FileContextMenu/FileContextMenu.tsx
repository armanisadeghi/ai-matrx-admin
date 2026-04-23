/**
 * features/files/components/core/FileContextMenu/FileContextMenu.tsx
 *
 * Right-click / three-dot menu for a file. Headless — parent provides `open`
 * + `onOpenChange`; this component renders the menu items and invokes the
 * appropriate handler.
 *
 * Mobile: parent surfaces should not use this — they should open a Drawer
 * with the same items via [MobileFileActionsDrawer] (TBD in Phase 4).
 */

"use client";

import { useCallback, useState } from "react";
import {
  Copy,
  Download,
  Edit2,
  FolderInput,
  Globe,
  Lock,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Visibility } from "../../../types";
import { useFileActions } from "../FileActions";

export interface FileContextMenuProps {
  fileId: string;
  children: React.ReactNode; // trigger
  onRename?: () => void;
  onShare?: () => void;
  onMove?: () => void;
  disabled?: boolean;
}

export function FileContextMenu({
  fileId,
  children,
  onRename,
  onShare,
  onMove,
  disabled,
}: FileContextMenuProps) {
  const actions = useFileActions(fileId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleVisibility = useCallback(
    async (visibility: Visibility) => {
      await actions.setVisibility(visibility);
    },
    [actions],
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => void actions.download()}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              void actions.copyShareUrl();
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy link
          </DropdownMenuItem>
          {onShare ? (
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share…
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />

          {onRename ? (
            <DropdownMenuItem onClick={onRename}>
              <Edit2 className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
          ) : null}
          {onMove ? (
            <DropdownMenuItem onClick={onMove}>
              <FolderInput className="mr-2 h-4 w-4" />
              Move…
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Lock className="mr-2 h-4 w-4" />
              Visibility
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => void handleVisibility("private")}>
                <Lock className="mr-2 h-4 w-4" />
                Private
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleVisibility("shared")}>
                <Users className="mr-2 h-4 w-4" />
                Shared
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleVisibility("public")}>
                <Globe className="mr-2 h-4 w-4" />
                Public
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the file to trash. You can restore it from
              versions for 30 days before bytes are removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void actions.delete({ hard: false });
                setConfirmOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
