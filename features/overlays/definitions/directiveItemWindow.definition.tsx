"use client";

// The `directiveItemWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./directiveItemWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { DirectiveItemWindowDefinitionData } from "./directiveItemWindow.overlay";

export const directiveItemWindowOverlay = defineOverlay<DirectiveItemWindowDefinitionData>()({
  id: "directiveItemWindow",
  label: "Proposed item",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { item: null, itemKind: null, title: null, subtitle: null },
    windowId: "directive-item-window",
    mobile: "drawer",
    ephemeral: true,
  },
});
