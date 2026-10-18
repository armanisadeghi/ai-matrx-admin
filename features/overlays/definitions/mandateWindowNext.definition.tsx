"use client";

// The `mandateWindowNext` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./mandateWindowNext.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { MandateWindowNextDefinitionData } from "./mandateWindowNext.overlay";

export const mandateWindowNextOverlay = defineOverlay<MandateWindowNextDefinitionData>()({
  id: "mandateWindowNext",
  label: "Mandates (new)",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          initialMandateKey: null,
          initialTab: null,
        },
    windowId: "mandate-window-next",
    mobile: "drawer",
    mobileSidebarAs: "drawer",
    preservation: { dataKeys: ["initialMandateKey", "initialTab"] },
  },
  link: {
    key: "mandate_next",
    hydrate: (ctx) => import("./mandateWindowNext.link").then((m) => m.hydrate(ctx)),
  },
});
