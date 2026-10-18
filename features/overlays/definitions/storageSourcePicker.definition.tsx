"use client";

// The `storageSourcePicker` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./storageSourcePicker.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { StorageSourcePickerDefinitionData } from "./storageSourcePicker.overlay";

export const storageSourcePickerOverlay = defineOverlay<StorageSourcePickerDefinitionData>()({
  id: "storageSourcePicker",
  label: "Import from cloud storage",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          callbackGroupId: null,
          destinationFolderPath: "",
          accept: null,
          multiple: true,
        },
    windowId: "storage-source-picker",
    mobile: "fullscreen",
    ephemeral: true,
  },
});
