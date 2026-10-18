"use client";

// The `socialCardAnalyzerWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./socialCardAnalyzerWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SocialCardAnalyzerWindowDefinitionData } from "./socialCardAnalyzerWindow.overlay";

export const socialCardAnalyzerWindowOverlay = defineOverlay<SocialCardAnalyzerWindowDefinitionData>()({
  id: "socialCardAnalyzerWindow",
  label: "Social Cards",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          url: "",
          title: "",
          description: "",
          image: "",
          siteName: "",
          ogType: "",
          cardType: "",
        },
    windowId: "social-card-window",
    mobile: "fullscreen",
  },
  link: {
    key: "social_cards",
    hydrate: (ctx) => import("./socialCardAnalyzerWindow.link").then((m) => m.hydrate(ctx)),
  },
});
