"use client";

// The `liveIntegrationsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./liveIntegrationsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { LiveIntegrationsWindowDefinitionData } from "./liveIntegrationsWindow.overlay";

export const liveIntegrationsWindowOverlay = defineOverlay<LiveIntegrationsWindowDefinitionData>()({
  id: "liveIntegrationsWindow",
  label: "Live Integrations",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "live-integrations-window",
    mobile: "fullscreen",
  },
});
