"use client";

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "drillDeckContextWindow" as const;

export interface OpenDrillDeckContextWindowOptions {}

export interface DrillDeckContextWindowHandle {
  close: () => void;
}

/** Open the singleton Drill Deck Surface-A WindowPanel. */
const opener = appOpener<OpenDrillDeckContextWindowOptions>(OVERLAY_ID, {
  data: () => ({}),
});

export const useOpenDrillDeckContextWindow = opener.useOpen;

/** Declarative form: mount to open, unmount to close. */
export const DrillDeckContextWindowController = opener.Controller;

export type DrillDeckContextWindowDefinitionData = OpenDrillDeckContextWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    drillDeckContextWindow: OverlayWire<DrillDeckContextWindowDefinitionData>;
  }
}
