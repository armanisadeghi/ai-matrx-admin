"use client";

// The `adminIndicator` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./adminIndicator.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AdminIndicatorDefinitionData } from "./adminIndicator.overlay";

export const adminIndicatorOverlay = defineOverlay<AdminIndicatorDefinitionData>()({
  id: "adminIndicator",
  label: "Admin Indicator",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
