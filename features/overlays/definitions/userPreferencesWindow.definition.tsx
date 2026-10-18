"use client";

// The `userPreferencesWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./userPreferencesWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { UserPreferencesWindowDefinitionData } from "./userPreferencesWindow.overlay";

export const userPreferencesWindowOverlay = defineOverlay<UserPreferencesWindowDefinitionData>()({
  id: "userPreferencesWindow",
  label: "User Preferences Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  link: {
    key: "user_preferences",
    hydrate: (ctx) => import("./userPreferencesWindow.link").then((m) => m.hydrate(ctx)),
  },
});
