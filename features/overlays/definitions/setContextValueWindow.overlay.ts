"use client";

import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

export type SetContextValueWindowDefinitionData = Record<string, unknown>;

export const setContextValueWindowOverlay = /* @__PURE__ */ defineOverlay<SetContextValueWindowDefinitionData>()({
  id: "setContextValueWindow",
  label: "Set Context Value Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {},
});

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    setContextValueWindow: OverlayWire<SetContextValueWindowDefinitionData>;
  }
}
