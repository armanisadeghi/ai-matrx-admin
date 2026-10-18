"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { PartyKind } from "@/features/crm/types";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "crmCreatePartyWindow" as const;

export interface OpenCrmCreatePartyWindowOptions {
  initialKind?: PartyKind;
  initialOrgId?: string | null;
  /** A name the calling surface already knows — prefilled into the form. */
  initialName?: string | null;
}

export interface CrmCreatePartyWindowHandle {
  close: () => void;
}

export function useOpenCrmCreatePartyWindow() {
  const dispatch = useAppDispatch();
  return (
    options: OpenCrmCreatePartyWindowOptions = {},
  ): CrmCreatePartyWindowHandle => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        data: {
          initialKind: options.initialKind,
          initialOrgId: options.initialOrgId,
          initialName: options.initialName,
        },
      }),
    );
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function CrmCreatePartyWindowController(
  props: OpenCrmCreatePartyWindowOptions,
): null {
  const open = useOpenCrmCreatePartyWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.initialKind, props.initialOrgId, props.initialName]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type CrmCreatePartyWindowDefinitionData = OpenCrmCreatePartyWindowOptions;

export const crmCreatePartyWindowOverlay = /* @__PURE__ */ defineOverlay<CrmCreatePartyWindowDefinitionData>()({
  id: "crmCreatePartyWindow",
  label: "Create CRM Record",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialKind: "person", initialOrgId: null },
    windowId: "crm-create-party-window",
    mobile: "drawer",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    crmCreatePartyWindow: OverlayWire<CrmCreatePartyWindowDefinitionData>;
  }
}
