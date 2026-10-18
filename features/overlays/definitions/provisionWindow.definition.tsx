"use client";

// The `provisionWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./provisionWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ProvisionWindowDefinitionData } from "./provisionWindow.overlay";

export const provisionWindowOverlay = defineOverlay<ProvisionWindowDefinitionData>()({
  id: "provisionWindow",
  label: "Provision",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { snapshotId: null, title: null },
    windowId: "provision-window",
    mobile: "fullscreen",
    preservation: { dataKeys: ["snapshotId", "title"] },
  },
  link: {
    key: "provision",
    hydrate: (ctx) => import("./provisionWindow.link").then((m) => m.hydrate(ctx)),
  },
});
