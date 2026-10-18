"use client";

// The `fullScreenEditor` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./fullScreenEditor.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { FullScreenEditorDefinitionData } from "./fullScreenEditor.overlay";

export const fullScreenEditorOverlay = defineOverlay<FullScreenEditorDefinitionData>()({
  id: "fullScreenEditor",
  label: "Full Screen Editor",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});
