"use client";

import type { OverlayWire } from "./overlay-types";

export type UserSearchWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    userSearchWindow: OverlayWire<UserSearchWindowDefinitionData>;
  }
}
