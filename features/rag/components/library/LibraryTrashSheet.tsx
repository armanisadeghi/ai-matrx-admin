"use client";

/**
 * Owner-only Trash for library documents (Wave A soft-delete, Decision 5).
 *
 * Lists the caller's soft-deleted processed documents via
 * `rag.fn_list_library_trash` (SECURITY DEFINER, owner-scoped). Two row
 * flavors:
 *   - individually trashed (no `deleted_via`): Restore per document
 *     (`fn_restore_library_document`).
 *   - file-cascade trashed (`deleted_via='file_cascade'`): the family
 *     restores TOGETHER via the file — Restore here calls the cloud-files
 *     `restore_file` RPC, and the DB trigger brings back the whole family
 *     (docs + chunks + memberships) atomically.
 *
 * Purge remains a service-role lifecycle operation; this client surface never
 * destroys a document. The list itself is `LibraryTrashTable` (shared table), also
 * mounted by /knowledge/trash.
 */

import { Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ai-matrx/design-system";
import AppLink from "@/components/navigation/AppLink";
import { LibraryTrashTable } from "@/features/rag/components/library/LibraryTrashTable";

interface LibraryTrashSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a restore so the live list can refresh. */
  onMutated?: () => void;
}

export function LibraryTrashSheet({
  open,
  onOpenChange,
  onMutated,
}: LibraryTrashSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Library trash
            <AppLink
              href="/knowledge/trash"
              className="ml-auto type-meta font-normal text-primary underline-offset-2 hover:underline"
            >
              Open as page
            </AppLink>
          </SheetTitle>
          <SheetDescription>Restorable until purged</SheetDescription>
        </SheetHeader>
        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          {open ? (
            <LibraryTrashTable tableId="knowledge.library-trash-drawer" onMutated={onMutated} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
