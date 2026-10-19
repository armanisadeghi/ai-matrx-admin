"use client";

import { useEffect, useMemo } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { AppDispatch } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { PartyKind } from "@/features/crm/types";
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

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createCrmCreatePartyWindowOpener(store: { dispatch: AppDispatch }) {
  const dispatch = store.dispatch;
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

export function useOpenCrmCreatePartyWindow() {
  const dispatch = useAppDispatch();
  return useMemo(() => createCrmCreatePartyWindowOpener({ dispatch }), [dispatch]);
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

export type CrmCreatePartyWindowDefinitionData = OpenCrmCreatePartyWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    crmCreatePartyWindow: OverlayWire<CrmCreatePartyWindowDefinitionData>;
  }
}
