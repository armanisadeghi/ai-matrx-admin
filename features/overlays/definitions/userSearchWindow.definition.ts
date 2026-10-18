"use client";

// The `userSearchWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./userSearchWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { UserSearchWindowDefinitionData } from "./userSearchWindow.overlay";

export const userSearchWindowOverlay = defineOverlay<UserSearchWindowDefinitionData>()({
  id: "userSearchWindow",
  label: "User Search",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          callbackGroupId: null as string | null,
          title: "Search users",
          initialQuery: "",
          directory: "provided",
          candidates: [],
          excludeUserIds: [],
        },
    windowId: "user-search-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});
