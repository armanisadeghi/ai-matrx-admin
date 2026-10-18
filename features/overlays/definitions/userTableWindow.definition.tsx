"use client";

// The `userTableWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./userTableWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { UserTableWindowDefinitionData } from "./userTableWindow.overlay";

export const userTableWindowOverlay = defineOverlay<UserTableWindowDefinitionData>()({
  id: "userTableWindow",
  label: "Custom Table Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {},
});
