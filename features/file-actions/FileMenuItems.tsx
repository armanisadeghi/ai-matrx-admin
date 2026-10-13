"use client";

/**
 * The menu rows of a file-like record — ONE list shared by the list row menu
 * (useFileItemActions → FileMenu) and the editor's File menu (FileRecordMenu). A row appears only
 * when its handler is given; owner-only rows also need `canManage`.
 */

import type { ReactNode } from "react";
import {
  ArchiveRestore,
  Copy,
  ExternalLink,
  FolderInput,
  LayoutTemplate,
  Pencil,
  Share2,
  Star,
  Trash2,
  Download,
} from "lucide-react";

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { promptForValues } from "@/components/dialogs/value-prompts/ValuePromptsDialogHost";
import type { FileDownload } from "./types";
import { openOutbound } from "@ai-matrx/kit/outbound";
import { useEditorMenuClass } from "@/components/editor-chrome/editor-menu-surface";

export type FileMenuItemsProps = {
  name: string;
  /** Opens the record; enables "Open in new tab". */
  href?: string;
  /** Owner (or Admin): Rename, Move, Move to trash, and Restore. */
  canManage: boolean;
  trashed?: boolean;
  starred?: boolean;
  onShare?: () => void;
  onToggleStar?: () => void;
  onRename?: (name: string) => Promise<void> | void;
  onCopy?: () => Promise<void> | void;
  /** Opens "Save as template" (owned by the parent menu so it outlives this list). */
  onSaveAsTemplateRequest?: () => void;
  /** Opens the move dialog (owned by the parent menu so it outlives this list). */
  onMoveRequest?: () => void;
  downloads?: FileDownload[];
  onDownload?: (d: FileDownload) => Promise<void> | void;
  onTrash?: () => Promise<void> | void;
  onRestore?: () => Promise<void> | void;
  /** Extra rows (Print, Find and replace, Comments…) between the common rows and Trash. */
  extra?: ReactNode;
};

/** The one Rename prompt of a file-like record (list row menu and editor File menu). */
export async function promptRename(name: string, onRename: (name: string) => Promise<void> | void): Promise<void> {
  const answers = await promptForValues({
    title: "Rename",
    submitLabel: "Rename",
    fields: [{ name: "name", prompt: "Name", defaultValue: name, required: true }],
  });
  const next = answers?.name?.trim();
  if (next && next !== name) await onRename(next);
}

export function FileMenuItems(p: FileMenuItemsProps): ReactNode {
  const subClass = useEditorMenuClass();
  const rename = async () => {
    if (p.onRename) await promptRename(p.name, p.onRename);
  };

  if (p.trashed) {
    return p.canManage && p.onRestore ? (
      <DropdownMenuItem onSelect={() => void p.onRestore?.()}>
        <ArchiveRestore className="mr-2 size-4" />
        Restore
      </DropdownMenuItem>
    ) : null;
  }

  return (
    <>
      {p.onShare && (
        <DropdownMenuItem onSelect={p.onShare}>
          <Share2 className="mr-2 size-4" />
          Share
        </DropdownMenuItem>
      )}
      {p.href && (
        <DropdownMenuItem onSelect={() => openOutbound(p.href, "_blank", "noopener")}>
          <ExternalLink className="mr-2 size-4" />
          Open in new tab
        </DropdownMenuItem>
      )}
      {p.onToggleStar && (
        <DropdownMenuItem onSelect={p.onToggleStar}>
          <Star className={`mr-2 size-4 ${p.starred ? "fill-current text-amber-500" : ""}`} />
          {p.starred ? "Remove star" : "Star"}
        </DropdownMenuItem>
      )}
      {p.canManage && p.onRename && (
        <DropdownMenuItem onSelect={() => void rename()}>
          <Pencil className="mr-2 size-4" />
          Rename
        </DropdownMenuItem>
      )}
      {p.onCopy && (
        <DropdownMenuItem onSelect={() => void p.onCopy?.()}>
          <Copy className="mr-2 size-4" />
          Make a copy
        </DropdownMenuItem>
      )}
      {p.onSaveAsTemplateRequest && (
        <DropdownMenuItem onSelect={p.onSaveAsTemplateRequest}>
          <LayoutTemplate className="mr-2 size-4" />
          Save as template
        </DropdownMenuItem>
      )}
      {p.canManage && p.onMoveRequest && (
        <DropdownMenuItem onSelect={p.onMoveRequest}>
          <FolderInput className="mr-2 size-4" />
          Move to project
        </DropdownMenuItem>
      )}
      {p.downloads && p.downloads.length > 0 && p.onDownload && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Download className="mr-2 size-4" />
            Download
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className={subClass}>
            {p.downloads.map((d) => (
              <DropdownMenuItem key={d.label} onSelect={() => void p.onDownload?.(d)}>
                {d.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )}
      {p.extra}
      {p.canManage && p.onTrash && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => void p.onTrash?.()}
          >
            <Trash2 className="mr-2 size-4" />
            Move to trash
          </DropdownMenuItem>
        </>
      )}
    </>
  );
}
