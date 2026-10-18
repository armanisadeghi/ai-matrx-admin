"use client";

// The `quickUtilities` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./quickUtilities.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { QuickUtilitiesDefinitionData } from "./quickUtilities.overlay";

export const quickUtilitiesOverlay = defineOverlay<QuickUtilitiesDefinitionData>()({
  id: "quickUtilities",
  label: "Quick Utilities",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
