"use client";

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "masterworkYourWordsWindow" as const;

export interface OpenMasterworkYourWordsWindowOptions {
  rulebookId: string;
}

export interface MasterworkYourWordsWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenMasterworkYourWordsWindowOptions>(OVERLAY_ID);

export const useOpenMasterworkYourWordsWindow = opener.useOpen;

export const MasterworkYourWordsWindowController = opener.Controller;

export type MasterworkYourWordsWindowDefinitionData = OpenMasterworkYourWordsWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    masterworkYourWordsWindow: OverlayWire<MasterworkYourWordsWindowDefinitionData>;
  }
}
