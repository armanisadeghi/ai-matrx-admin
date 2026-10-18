"use client";

/**
 * Opener for the `welcomeFoundWindow` overlay — the sign-up welcome's "here's what we found", in a window over
 * whatever page the person is on (features/marketing/smart-add/welcome; SIGNUP-WELCOME.md). The found-you notice
 * opens it through its `?panels=welcome-found` link; nothing else needs to.
 *
 * - `useOpenWelcomeFoundWindow()` — imperative hook; returns a handle with `close()`.
 * - `<WelcomeFoundWindowController />` — declarative: mount to open, unmount to close.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "welcomeFoundWindow" as const;

export interface WelcomeFoundWindowHandle {
  close: () => void;
}

export function useOpenWelcomeFoundWindow() {
  const dispatch = useAppDispatch();
  return useCallback((): WelcomeFoundWindowHandle => {
    dispatch(openOverlay({ overlayId: OVERLAY_ID }));
    return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
  }, [dispatch]);
}

export function WelcomeFoundWindowController(): null {
  const open = useOpenWelcomeFoundWindow();
  useEffect(() => {
    const handle = open();
    return () => handle.close();
  }, [open]);
  return null;
}

export type WelcomeFoundWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    welcomeFoundWindow: OverlayWire<WelcomeFoundWindowDefinitionData>;
  }
}
