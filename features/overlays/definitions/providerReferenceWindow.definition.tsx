"use client";

// The `providerReferenceWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./providerReferenceWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ProviderReferenceWindowDefinitionData } from "./providerReferenceWindow.overlay";

export const providerReferenceWindowOverlay = defineOverlay<ProviderReferenceWindowDefinitionData>()({
  id: "providerReferenceWindow",
  label: "Provider Reference",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    windowId: "provider-reference-window",
    mobile: "fullscreen",
  },
});
