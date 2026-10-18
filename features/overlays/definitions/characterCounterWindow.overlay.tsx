"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
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

export type CharacterCounterWindowDefinitionData = OpenCharacterCounterWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    characterCounterWindow: OverlayWire<CharacterCounterWindowDefinitionData>;
  }
}
