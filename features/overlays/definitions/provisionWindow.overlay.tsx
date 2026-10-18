"use client";

/**
 * Opener for the `provisionWindow` overlay — the Provision window (features/provision-window).
 * `openProvisionWindow(snapshotId)` shows one saved capture of a call point's values.
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */
import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "provisionWindow" as const;

export function useOpenProvisionWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (snapshotId: string, title?: string) => {
      dispatch(openOverlay({ overlayId: OVERLAY_ID, data: { snapshotId, title } }));
      return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ProvisionWindowDefinitionData = Record<string, unknown>;

export const provisionWindowOverlay = /* @__PURE__ */ defineOverlay<ProvisionWindowDefinitionData>()({
  id: "provisionWindow",
  label: "Provision",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { snapshotId: null, title: null },
    windowId: "provision-window",
    mobile: "fullscreen",
    preservation: { dataKeys: ["snapshotId", "title"] },
  },
  link: {
    key: "provision",
    hydrate: (ctx) => import("./provisionWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    provisionWindow: OverlayWire<ProvisionWindowDefinitionData>;
  }
}
