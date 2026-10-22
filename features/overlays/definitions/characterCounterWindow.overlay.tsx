"use client";

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "characterCounterWindow" as const;

export interface OpenCharacterCounterWindowOptions {
  initialText?: string;
}

const opener = appOpener<OpenCharacterCounterWindowOptions>(OVERLAY_ID);

export const useOpenCharacterCounterWindow = opener.useOpen;

export const CharacterCounterWindowController = opener.Controller;

export type CharacterCounterWindowDefinitionData = OpenCharacterCounterWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    characterCounterWindow: OverlayWire<CharacterCounterWindowDefinitionData>;
  }
}
