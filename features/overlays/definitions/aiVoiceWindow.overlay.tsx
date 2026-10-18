"use client";

/**
 * Opener for the `aiVoiceWindow` overlay.
 *
 * - `useOpenAiVoiceWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AiVoiceWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "aiVoiceWindow" as const;

export interface OpenAiVoiceWindowOptions {
  title?: string;
}

export interface AiVoiceWindowHandle {
  close: () => void;
}

export function useOpenAiVoiceWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAiVoiceWindowOptions = {}): AiVoiceWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            title: opts.title,
          },
        }),
      );
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function AiVoiceWindowController(props: OpenAiVoiceWindowOptions): null {
  const open = useOpenAiVoiceWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.title]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AiVoiceWindowDefinitionData = OpenAiVoiceWindowOptions;

export const aiVoiceWindowOverlay = /* @__PURE__ */ defineOverlay<AiVoiceWindowDefinitionData>()({
  id: "aiVoiceWindow",
  label: "Ai Voice Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { voiceId: null, speed: null, model: null },
    windowId: "ai-voice-window",
    mobile: "fullscreen",
  },
  link: {
    key: "aiVoiceWindow",
    hydrate: (ctx) => import("./aiVoiceWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    aiVoiceWindow: OverlayWire<AiVoiceWindowDefinitionData>;
  }
}
