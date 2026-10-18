"use client";

// The `pageResearchWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./pageResearchWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { PageResearchWindowDefinitionData } from "./pageResearchWindow.overlay";

export const pageResearchWindowOverlay = defineOverlay<PageResearchWindowDefinitionData>()({
  id: "pageResearchWindow",
  label: "Research for this page",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          nodeId: "",
          siteId: "",
          pageLabel: "",
          primaryKeyword: "",
          orgId: "",
        },
    windowId: "page-research-window",
    mobile: "fullscreen",
  },
});
