"use client";

// NoteContextMenu — Thin trigger shell. Only ContextMenu + ContextMenuTrigger
// land in the initial bundle (~1KB). The heavy content (icons, hooks, Redux
// selectors, AI execution, find/replace) is lazy-loaded as soon as a note
// is displayed — not deferred until the first right-click, which would leave
// Radix with no ContextMenuContent node on the initial open and cause errors.

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import dynamic from "next/dynamic";
import type { NoteContextMenuContentProps } from "./NoteContextMenuContent";

const NoteContextMenuContent = dynamic(
  () => import("./NoteContextMenuContent"),
  {
    ssr: false,
    // Provide an empty-but-valid ContextMenuContent so Radix always sees a
    // content node, even on very slow connections before the chunk arrives.
    loading: () => (
      <ContextMenuContent className="w-0 h-0 p-0 overflow-hidden" />
    ),
  },
);

export interface NoteContextMenuProps extends NoteContextMenuContentProps {
  children: React.ReactNode;
}

export default function NoteContextMenu({
  children,
  ...contentProps
}: NoteContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <NoteContextMenuContent {...contentProps} />
    </ContextMenu>
  );
}
