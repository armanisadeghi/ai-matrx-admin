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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareModal } from "@/features/sharing/components/ShareModal";
import type { ResourceType } from "@/utils/permissions/types";
import {
  GoogleLinkMenuItems,
  useGoogleLink,
  type GoogleLinkAdapter,
} from "@/features/google-workspace/linked/GoogleLinkControl";
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
  /**
   * Google Sheets / Docs rows (Open in Google, Create, Update, Push). The ONE Google link
   * implementation (`GoogleLinkMenuItems`); the adapter says where this record's content comes from.
   */
  google?: { adapter: GoogleLinkAdapter; editable: boolean };
  /** Open the menu from outside (a card's right-click — `FileCardContextArea`). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Mounts the Google link state beside the dropdown, so its dialogs outlive the menu closing. */
function GoogleHost({
  google,
  active,
  children,
}: {
  google: NonNullable<FileMenuProps["google"]>;
  active: boolean;
  children: (rows: ReactNode) => ReactNode;
}): ReactNode {
  const g = useGoogleLink(google.adapter, google.editable, active);
  return (
    <>
      {children(
        <>
          <DropdownMenuSeparator />
          <GoogleLinkMenuItems g={g} withLabel={false} />
        </>,
      )}
      {g.dialog}
    </>
  );
}

function GoogleSlot({
  google,
  active,
  children,
}: {
  google: FileMenuProps["google"];
  active: boolean;
  children: (rows: ReactNode) => ReactNode;
}): ReactNode {
  if (!google) return children(null);
  return (
    <GoogleHost google={google} active={active}>
      {children}
    </GoogleHost>
  );
}

export function FileMenu({
  resourceType,
  id,
  shareable = true,
  shareButton = false,
  projectId = null,
  onMove,
  trigger = "icon",
  disabled,
  google,
  open,
  onOpenChange,
  ...items
}: FileMenuProps): ReactNode {
  const [menuOpened, setMenuOpened] = useState(false);
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
        <GoogleSlot google={trashed ? undefined : google} active={menuOpened || open === true}>
          {(googleRows) => (
            <DropdownMenu
              {...(open !== undefined ? { open } : {})}
              onOpenChange={(next) => {
                if (next) setMenuOpened(true);
                onOpenChange?.(next);
              }}
            >
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
                  extra={
                    <>
                      {items.extra}
                      {googleRows}
                    </>
                  }
                  {...(shareable ? { onShare: () => setShareOpen(true) } : {})}
                  {...(onMove ? { onMoveRequest: () => setMoveOpen(true) } : {})}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </GoogleSlot>
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
