"use client";

/**
 * Opener for the `voicePad` overlay.
 *
 * - `useOpenVoicePad()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<VoicePadController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "voicePad" as const;

export interface OpenVoicePadOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
}

export interface VoicePadHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenVoicePad() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenVoicePadOptions = {}): VoicePadHandle => {
      const instanceId = opts.instanceId ?? `voicePad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          instanceId,
          data: {
          },
        }),
      );
      return {
        instanceId,
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId })),
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
export function VoicePadController(props: OpenVoicePadOptions): null {
  const open = useOpenVoicePad();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type VoicePadDefinitionData = OpenVoicePadOptions;

export const voicePadOverlay = defineOverlay<VoicePadDefinitionData>()({
  id: "voicePad",
  label: "Voice Pad",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { transcript: null },
    windowId: "voice-pad",
    mobile: "fullscreen",
  },
  link: {
    key: "voice",
    hydrate: (ctx) => import("./voicePad.link").then((m) => m.hydrate(ctx)),
  },
  render: () => import("./voicePad.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    voicePad: OverlayWire<VoicePadDefinitionData>;
  }
}
