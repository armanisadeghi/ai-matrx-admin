"use client";

// The `socialPostWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./socialPostWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SocialPostWindowDefinitionData } from "./socialPostWindow.overlay";

export const socialPostWindowOverlay = defineOverlay<SocialPostWindowDefinitionData>()({
  id: "socialPostWindow",
  label: "Post",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: true,
  window: {
    restoreDefaults: { postId: "", organizationId: "", brandSeg: "", tab: "overview" },
    windowId: "social-post-window",
    mobile: "drawer",
    preservation: {
      dataKeys: ["postId", "organizationId", "brandSeg", "tab"],
      requiredDataKeys: ["postId", "organizationId"],
    },
  },
  link: {
    key: "social_post",
    hydrate: (ctx) => import("./socialPostWindow.link").then((m) => m.hydrate(ctx)),
  },
});
