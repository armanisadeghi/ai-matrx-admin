"use client";

// The `directiveReferencePickerWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./directiveReferencePickerWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { DirectiveReferencePickerWindowDefinitionData } from "./directiveReferencePickerWindow.overlay";

export const directiveReferencePickerWindowOverlay = defineOverlay<DirectiveReferencePickerWindowDefinitionData>()({
  id: "directiveReferencePickerWindow",
  label: "Directive Reference Picker Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          callbackGroupId: null as string | null,
          entityToken: null as string | null,
          fieldKey: "id",
          title: null as string | null,
        },
    windowId: "directive-reference-picker-window",
    mobile: "drawer",
    ephemeral: true,
  },
});
