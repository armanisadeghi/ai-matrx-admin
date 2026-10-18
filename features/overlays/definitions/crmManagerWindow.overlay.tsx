"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "crmManagerWindow" as const;

export interface CrmManagerWindowHandle {
  close: () => void;
}

export function useOpenCrmManagerWindow() {
  const dispatch = useAppDispatch();
  return (): CrmManagerWindowHandle => {
    dispatch(openOverlay({ overlayId: OVERLAY_ID }));
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function CrmManagerWindowController(): null {
  const open = useOpenCrmManagerWindow();
  useEffect(() => {
    const handle = open();
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type CrmManagerWindowDefinitionData = Record<string, unknown>;

export const crmManagerWindowOverlay = /* @__PURE__ */ defineOverlay<CrmManagerWindowDefinitionData>()({
  id: "crmManagerWindow",
  label: "CRM Manager",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "crm-manager-window",
    mobile: "fullscreen",
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    crmManagerWindow: OverlayWire<CrmManagerWindowDefinitionData>;
  }
}
