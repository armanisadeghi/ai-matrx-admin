"use client";

/**
 * A list CARD's right-click opens the same file menu its ⋯ button opens (table
 * rows already do, through the table's context menu) — one menu, two doors.
 * The browser's own menu stays available with Shift+right-click.
 */

import { useState, type ReactNode } from "react";

export type FileMenuControl = { open: boolean; onOpenChange: (open: boolean) => void };

export function FileCardContextArea({
  menu,
  children,
  className,
}: {
  /** The card's file menu, opened by this area (`menuFor(row, trashed, control)`). */
  menu: (control: FileMenuControl) => ReactNode;
  /** The card, given the menu node to place where its ⋯ button sits. */
  children: (menuNode: ReactNode) => ReactNode;
  className?: string;
}): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={className}
      data-file-card-context=""
      onContextMenu={(event) => {
        if (event.shiftKey) return;
        event.preventDefault();
        setOpen(true);
      }}
    >
      {children(menu({ open, onOpenChange: setOpen }))}
    </div>
  );
}
