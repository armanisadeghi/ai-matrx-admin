"use client";

// The `siteCommandRunWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./siteCommandRunWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SiteCommandRunWindowDefinitionData } from "./siteCommandRunWindow.overlay";

export const siteCommandRunWindowOverlay = defineOverlay<SiteCommandRunWindowDefinitionData>()({
  id: "siteCommandRunWindow",
  label: "Site Command Run",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "site-command-run-window",
    mobile: "card",
  },
});
