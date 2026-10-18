"use client";

// The `noteInfoWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./noteInfoWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { NoteInfoWindowDefinitionData } from "./noteInfoWindow.overlay";

export const noteInfoWindowOverlay = defineOverlay<NoteInfoWindowDefinitionData>()({
  id: "noteInfoWindow",
  label: "Note Info",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { noteId: null, title: undefined },
    windowId: "note-info-window",
    mobile: "drawer",
    ephemeral: true,
  },
});
