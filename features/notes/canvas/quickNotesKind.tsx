"use client";

/**
 * Quick Notes as a canvas tab — the canonical NotesView (through
 * QuickNotesSheet) in a tab of its own. One tab: reopening focuses it.
 */

import { ExternalLink, StickyNote } from "lucide-react";
import { defineCanvasKind } from "@ai-matrx/canvas/react";
import { useToolOpener } from "@/features/canvas/host/toolCanvas";

import { QUICK_NOTES_KIND, QUICK_NOTES_TITLE as TITLE } from "@/features/canvas/host/quickToolLaunchers";
import { openOutbound } from "@ai-matrx/kit/outbound";

export { QUICK_NOTES_KIND };

export const quickNotesKind = defineCanvasKind<null>({
  id: QUICK_NOTES_KIND,
  surface: "dom",
  label: TITLE,
  icon: StickyNote,
  load: () => import("./QuickNotesCanvasView"),
  restore: true,
  launcher: { key: "default", data: null, title: TITLE },
  menuItems: () => [
    {
      id: "open-notes-page",
      label: "Open Notes",
      icon: <ExternalLink />,
      onSelect: () => openOutbound("/notes", "_blank", "noopener"),
    },
  ],
});
