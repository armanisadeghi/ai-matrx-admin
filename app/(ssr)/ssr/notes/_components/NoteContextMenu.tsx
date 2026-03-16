"use client";

// NoteContextMenu — Thin trigger shell. Only ContextMenu + ContextMenuTrigger
// land in the initial bundle (~1KB). The heavy content (icons, hooks, Redux
// selectors, AI execution, find/replace) is lazy-loaded on first right-click.

import { useState } from "react";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import dynamic from "next/dynamic";
import type { NoteContextMenuContentProps } from "./NoteContextMenuContent";

const NoteContextMenuContent = dynamic(
  () => import("./NoteContextMenuContent"),
  { ssr: false, loading: () => null }
);

export interface NoteContextMenuProps extends NoteContextMenuContentProps {
  children: React.ReactNode;
}

export default function NoteContextMenu({
  children,
  ...contentProps
}: NoteContextMenuProps) {
  // Track whether the menu has ever been opened so we don't even mount the
  // lazy chunk until the user triggers the context menu for the first time.
  const [everOpened, setEverOpened] = useState(false);

  return (
    <ContextMenu onOpenChange={(open) => { if (open) setEverOpened(true); }}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      {everOpened && <NoteContextMenuContent {...contentProps} />}
    </ContextMenu>
  );
}
