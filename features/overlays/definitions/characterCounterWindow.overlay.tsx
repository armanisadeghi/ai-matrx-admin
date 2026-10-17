"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "characterCounterWindow" as const;

export interface OpenCharacterCounterWindowOptions {
  initialText?: string;
}

export function useOpenCharacterCounterWindow() {
  const dispatch = useAppDispatch();
  return useCallback((options: OpenCharacterCounterWindowOptions = {}) => {
    dispatch(openOverlay({ overlayId: OVERLAY_ID, data: { initialText: options.initialText } }));
    return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
  }, [dispatch]);
}

export function CharacterCounterWindowController({ initialText }: OpenCharacterCounterWindowOptions): null {
  const open = useOpenCharacterCounterWindow();
  useEffect(() => {
    const handle = open({ initialText });
    return () => {
      handle.close();
    };
  }, [open, initialText]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type CharacterCounterWindowDefinitionData = OpenCharacterCounterWindowOptions;

export const characterCounterWindowOverlay = defineOverlay<CharacterCounterWindowDefinitionData>()({
  id: "characterCounterWindow",
  label: "Character Counter",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialText: "" },
    windowId: "character-counter-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
  render: () => import("./characterCounterWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    characterCounterWindow: OverlayWire<CharacterCounterWindowDefinitionData>;
  }
}
