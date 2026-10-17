"use client";

/**
 * Opener for the `voicePadAdvanced` overlay.
 *
 * - `useOpenVoicePadAdvanced()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<VoicePadAdvancedController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "voicePadAdvanced" as const;

export interface OpenVoicePadAdvancedOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
}

export interface VoicePadAdvancedHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenVoicePadAdvanced() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenVoicePadAdvancedOptions = {}): VoicePadAdvancedHandle => {
      const instanceId = opts.instanceId ?? `voicePadAdvanced-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
export function VoicePadAdvancedController(props: OpenVoicePadAdvancedOptions): null {
  const open = useOpenVoicePadAdvanced();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type VoicePadAdvancedDefinitionData = OpenVoicePadAdvancedOptions;

export const voicePadAdvancedOverlay = defineOverlay<VoicePadAdvancedDefinitionData>()({
  id: "voicePadAdvanced",
  label: "Voice Pad Advanced",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { transcript: null },
    windowId: "voice-pad-advanced",
    mobile: "fullscreen",
  },
  link: {
    key: "voice-advanced",
    hydrate: (ctx) => import("./voicePadAdvanced.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    voicePadAdvanced: OverlayWire<VoicePadAdvancedDefinitionData>;
  }
}
