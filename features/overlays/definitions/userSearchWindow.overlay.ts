"use client";

import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

export type UserSearchWindowDefinitionData = Record<string, unknown>;

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
  render: () => import("./userSearchWindow.render"),
});


declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    userSearchWindow: OverlayWire<UserSearchWindowDefinitionData>;
  }
}
