"use client";

// The `favoritesManagerWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./favoritesManagerWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { FavoritesManagerWindowDefinitionData } from "./favoritesManagerWindow.overlay";

export const favoritesManagerWindowOverlay = defineOverlay<FavoritesManagerWindowDefinitionData>()({
  id: "favoritesManagerWindow",
  label: "Manage Favorites",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "favorites-manager-window",
    mobile: "drawer",
    ephemeral: true,
  },
});
