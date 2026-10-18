"use client";

// The `cloudBrowserWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./cloudBrowserWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CloudBrowserWindowDefinitionData } from "./cloudBrowserWindow.overlay";

export const cloudBrowserWindowOverlay = defineOverlay<CloudBrowserWindowDefinitionData>()({
  id: "cloudBrowserWindow",
  label: "Cloud Browser",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {},
});
