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
        // The menu drops from the card's ⋯ and can land UNDER the pointer; the right button's own
        // release would then press an item (Radix items act on pointer-up) and close it again.
        // So while the button is still down, open on its release.
        if ((event.buttons & 2) === 0) {
          setOpen(true);
          return;
        }
        const release = () => {
          window.removeEventListener("pointerup", release, true);
          window.removeEventListener("mouseup", release, true);
          setTimeout(() => setOpen(true), 0);
        };
        window.addEventListener("pointerup", release, true);
        window.addEventListener("mouseup", release, true);
      }}
    >
      {children(menu({ open, onOpenChange: setOpen }))}
    </div>
  );
}
