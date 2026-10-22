"use client";

/**
 * Opener for the `audioControlWindow` overlay — the compact "Media" panel
 * (playback queue & transport, live recording indicator, camera/capture
 * diagnostics, device pickers).
 *
 * - `useOpenAudioControlWindow()` — imperative hook. Call to open; returns a
 *   handle with a `close()` method.
 * - `<AudioControlWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 *
 * Mirrors the other singleton-window openers (e.g. `audioDevices`).
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { activateAudio } from "@/features/audio/activation";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./hook-controller";

const OVERLAY_ID = "audioControlWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

export interface AudioControlWindowHandle {
  close: () => void;
}

export function useOpenAudioControlWindow() {
  const dispatch = useAppDispatch();
  return useCallback((): AudioControlWindowHandle => {
    // Opening the Media panel is audio engagement — mount the lazy audio
    // system so the panel's mirrors (playback queue, sessions, devices) are
    // live. AudioSystemHost also gates on this overlay's Redux flag, but the
    // explicit latch covers it without a store read.
    activateAudio();
    opener.open(dispatch);
    return {
      close: () => dispatch(opener.close()),
    };
  }, [dispatch]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount.
 */
export const AudioControlWindowController = hookController(useOpenAudioControlWindow);

export type AudioControlWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    audioControlWindow: OverlayWire<AudioControlWindowDefinitionData>;
  }
}
