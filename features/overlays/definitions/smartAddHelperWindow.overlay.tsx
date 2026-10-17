"use client";

/**
 * Opener for the `smartAddHelperWindow` overlay — one Smart Add helper ("focused session") per
 * people-search method. The instance id is the method, so a second click focuses the same window.
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */
import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import type { HelperMethod } from "@/features/marketing/smart-add/helpers/types";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "smartAddHelperWindow" as const;

export function useOpenSmartAddHelper() {
  const dispatch = useAppDispatch();
  return useCallback(
    (method: HelperMethod) => {
      dispatch(openOverlay({ overlayId: OVERLAY_ID, instanceId: method, data: { method } }));
      return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId: method })) };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type SmartAddHelperWindowDefinitionData = Record<string, unknown>;

export const smartAddHelperWindowOverlay = defineOverlay<SmartAddHelperWindowDefinitionData>()({
  id: "smartAddHelperWindow",
  label: "Smart Add helper",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { method: null },
    windowId: "smart-add-helper-window",
    mobile: "fullscreen",
    preservation: { dataKeys: ["method"] },
  },
  link: {
    key: "smart_add_helper",
    hydrate: (ctx) => import("./smartAddHelperWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    smartAddHelperWindow: OverlayWire<SmartAddHelperWindowDefinitionData>;
  }
}
