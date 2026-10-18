"use client";

// The `crmManagerWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./crmManagerWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CrmManagerWindowDefinitionData } from "./crmManagerWindow.overlay";

export const crmManagerWindowOverlay = defineOverlay<CrmManagerWindowDefinitionData>()({
  id: "crmManagerWindow",
  label: "CRM Manager",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "crm-manager-window",
    mobile: "fullscreen",
  },
});
