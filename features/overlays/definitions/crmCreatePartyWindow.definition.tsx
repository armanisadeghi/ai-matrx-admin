"use client";

// The `crmCreatePartyWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./crmCreatePartyWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CrmCreatePartyWindowDefinitionData } from "./crmCreatePartyWindow.overlay";

export const crmCreatePartyWindowOverlay = defineOverlay<CrmCreatePartyWindowDefinitionData>()({
  id: "crmCreatePartyWindow",
  label: "Create CRM Record",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialKind: "person", initialOrgId: null },
    windowId: "crm-create-party-window",
    mobile: "drawer",
    ephemeral: true,
  },
});
