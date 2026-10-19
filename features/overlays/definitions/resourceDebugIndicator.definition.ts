"use client";

// The `resourceDebugIndicator` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./resourceDebugIndicator.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ResourceDebugIndicatorDefinitionData } from "./resourceDebugIndicator.overlay";

export const resourceDebugIndicatorOverlay = defineOverlay<ResourceDebugIndicatorDefinitionData>()({
  id: "resourceDebugIndicator",
  label: "Resource Debug Indicator",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
