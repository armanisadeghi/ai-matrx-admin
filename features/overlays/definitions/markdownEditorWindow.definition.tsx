"use client";

// The `markdownEditorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./markdownEditorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { MarkdownEditorWindowDefinitionData } from "./markdownEditorWindow.overlay";

export const markdownEditorWindowOverlay = defineOverlay<MarkdownEditorWindowDefinitionData>()({
  id: "markdownEditorWindow",
  label: "Markdown Editor Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          content: null,
          processorId: null,
          coordinatorId: null,
          sampleId: null,
        },
    windowId: "markdown-editor-window",
    mobile: "fullscreen",
  },
  link: {
    key: "markdown_editor",
    hydrate: (ctx) => import("./markdownEditorWindow.link").then((m) => m.hydrate(ctx)),
  },
});
