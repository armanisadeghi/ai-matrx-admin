"use client";

/** Editor-header counterpart of FileItemMenu: Make a copy / Move to trash. */

import { Copy, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function FileRecordMenu({
  onMakeCopy,
  onTrash,
}: {
  onMakeCopy?: () => void | Promise<void>;
  /** Owner only. */
  onTrash?: () => void | Promise<void>;
}) {
  if (!onMakeCopy && !onTrash) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          icon={<MoreHorizontal />}
          aria-label="File actions"
          title="Make a copy, move to trash"
          variant="quiet"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        {onMakeCopy && (
          <DropdownMenuItem onSelect={() => void onMakeCopy()}>
            <Copy className="mr-2 size-4" />
            Make a copy
          </DropdownMenuItem>
        )}
        {onMakeCopy && onTrash && <DropdownMenuSeparator />}
        {onTrash && (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => void onTrash()}
          >
            <Trash2 className="mr-2 size-4" />
            Move to trash
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
