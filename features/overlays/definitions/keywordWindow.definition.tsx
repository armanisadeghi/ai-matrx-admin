"use client";

// The `keywordWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./keywordWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { KeywordWindowDefinitionData } from "./keywordWindow.overlay";

export const keywordWindowOverlay = defineOverlay<KeywordWindowDefinitionData>()({
  id: "keywordWindow",
  label: "Keyword Intelligence",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          phrase: "",
          targetPhrase: "",
          history: [],
          organizationId: "",
          siteId: "",
          pageId: "",
          brandId: "",
          activeTab: "overview",
        },
    windowId: "keyword-window",
    mobile: "fullscreen",
    preservation: {
      dataKeys: [
        "phrase",
        "targetPhrase",
        "history",
        "activeTab",
        "organizationId",
        "siteId",
        "pageId",
        "brandId",
      ],
    },
  },
  link: {
    key: "keyword",
    hydrate: (ctx) => import("./keywordWindow.link").then((m) => m.hydrate(ctx)),
  },
});
