"use client";

// The `topicalMapTopicPanel` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./topicalMapTopicPanel.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { TopicalMapTopicPanelDefinitionData } from "./topicalMapTopicPanel.overlay";

export const topicalMapTopicPanelOverlay = defineOverlay<TopicalMapTopicPanelDefinitionData>()({
  id: "topicalMapTopicPanel",
  label: "Topic",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { mapId: "", slug: "", siteId: null },
    windowId: "topical-map-topic-panel",
    mobile: "drawer",
    preservation: {
      dataKeys: ["mapId", "slug", "siteId"],
      requiredDataKeys: ["mapId", "slug"],
    },
  },
  link: {
    key: "topic",
    hydrate: (ctx) => import("./topicalMapTopicPanel.link").then((m) => m.hydrate(ctx)),
  },
});
