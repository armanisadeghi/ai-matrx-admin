"use client";

// The `notesWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./notesWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { NotesWindowDefinitionData } from "./notesWindow.overlay";

export const notesWindowOverlay = defineOverlay<NotesWindowDefinitionData>()({
  id: "notesWindow",
  label: "Notes Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { openNoteId: null, title: undefined },
    windowId: "notes-window",
    mobile: "fullscreen",
  },
  link: {
    key: "notes",
    hydrate: (ctx) => import("./notesWindow.link").then((m) => m.hydrate(ctx)),
  },
});
