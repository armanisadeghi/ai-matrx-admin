"use client";

// The `marketingMediaAssetWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./marketingMediaAssetWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { MarketingMediaAssetWindowDefinitionData } from "./marketingMediaAssetWindow.overlay";

export const marketingMediaAssetWindowOverlay = defineOverlay<MarketingMediaAssetWindowDefinitionData>()({
  id: "marketingMediaAssetWindow",
  label: "Media Asset",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          callbackGroupId: null,
          siteId: null,
          assetSrc: null,
        },
    windowId: "marketing-media-asset-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});
