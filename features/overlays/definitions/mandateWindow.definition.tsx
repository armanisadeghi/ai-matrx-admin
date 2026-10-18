"use client";

// The `mandateWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./mandateWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { MandateWindowDefinitionData } from "./mandateWindow.overlay";

export const mandateWindowOverlay = defineOverlay<MandateWindowDefinitionData>()({
  id: "mandateWindow",
  label: "Mandates",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          initialMandateKey: null,
          mandateKeys: null,
          surfaceName: null,
          initialView: null,
        },
    windowId: "mandate-window",
    mobile: "drawer",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "mandate",
    hydrate: (ctx) => import("./mandateWindow.link").then((m) => m.hydrate(ctx)),
  },
});
