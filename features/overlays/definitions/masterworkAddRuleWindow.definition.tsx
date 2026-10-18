"use client";

// The `masterworkAddRuleWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./masterworkAddRuleWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { MasterworkAddRuleWindowDefinitionData } from "./masterworkAddRuleWindow.overlay";

export const masterworkAddRuleWindowOverlay = defineOverlay<MasterworkAddRuleWindowDefinitionData>()({
  id: "masterworkAddRuleWindow",
  label: "Add a rule",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          callbackGroupId: null as string | null,
          rulebookId: null as string | null,
          defaultSection: null as string | null,
        },
    windowId: "masterwork-add-rule-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});
