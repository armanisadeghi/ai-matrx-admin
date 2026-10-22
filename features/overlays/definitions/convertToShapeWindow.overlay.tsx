"use client";

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "convertToShapeWindow" as const;

export interface OpenConvertToShapeWindowOptions {
  initialJsonContent: string;
}

const opener = appOpener<OpenConvertToShapeWindowOptions>(OVERLAY_ID, {
  data: ({ initialJsonContent }: OpenConvertToShapeWindowOptions) => ({ initialJsonContent }),
});

export const useOpenConvertToShapeWindow = opener.useOpen;

export const ConvertToShapeWindowController = opener.Controller;

export type ConvertToShapeWindowDefinitionData = OpenConvertToShapeWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    convertToShapeWindow: OverlayWire<ConvertToShapeWindowDefinitionData>;
  }
}
