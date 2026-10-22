"use client";

// The `shareModalWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./shareModalWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import { RESOURCE_TYPES } from "@ai-matrx/sharing/core";
import type { ShareModalWindowDefinitionData } from "./shareModalWindow.overlay";

export const shareModalWindowOverlay = defineOverlay<ShareModalWindowDefinitionData>()({
  id: "shareModalWindow",
  label: "Share Modal Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          resourceType: null,
          resourceId: null,
          resourceName: null,
        },
    windowId: "share-modal-window",
    mobile: "drawer",
    preservation: {
      dataKeys: ["resourceType", "resourceId", "resourceName"],
      requiredDataKeys: ["resourceType", "resourceId"],
      allowedDataValues: { resourceType: RESOURCE_TYPES },
    },
  },
});
