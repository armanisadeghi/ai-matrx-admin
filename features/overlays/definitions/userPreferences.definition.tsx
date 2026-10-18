"use client";

// The `userPreferences` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./userPreferences.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { UserPreferencesDefinitionData } from "./userPreferences.overlay";

export const userPreferencesOverlay = defineOverlay<UserPreferencesDefinitionData>()({
  id: "userPreferences",
  label: "User Preferences",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
