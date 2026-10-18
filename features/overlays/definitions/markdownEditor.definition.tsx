"use client";

// The `markdownEditor` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./markdownEditor.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { MarkdownEditorDefinitionData } from "./markdownEditor.overlay";

export const markdownEditorOverlay = defineOverlay<MarkdownEditorDefinitionData>()({
  id: "markdownEditor",
  label: "Markdown Editor",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
