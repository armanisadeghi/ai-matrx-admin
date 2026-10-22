"use client";

// The `scopeEditWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./scopeEditWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ScopeEditWindowDefinitionData } from "./scopeEditWindow.overlay";

export const scopeEditWindowOverlay = defineOverlay<ScopeEditWindowDefinitionData>()({
  id: "scopeEditWindow",
  label: "Scope Editor",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          scopeId: null,
          scopeTypeId: null,
          organizationId: null,
          parentScopeId: null,
        },
    windowId: "scope-edit-window",
    mobile: "drawer",
  },
});
