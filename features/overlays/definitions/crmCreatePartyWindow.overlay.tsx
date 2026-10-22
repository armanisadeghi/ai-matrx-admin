"use client";

import { useMemo } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { AppDispatch } from "@/lib/redux/store";
import type { PartyKind } from "@/features/crm/types";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./app-opener";

const OVERLAY_ID = "crmCreatePartyWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

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
    opener.open(dispatch, { data: {
          initialKind: options.initialKind,
          initialOrgId: options.initialOrgId,
          initialName: options.initialName,
        } });
    return {
      close: () => dispatch(opener.close()),
    };
  };
}

export function useOpenCrmCreatePartyWindow() {
  const dispatch = useAppDispatch();
  return useMemo(() => createCrmCreatePartyWindowOpener({ dispatch }), [dispatch]);
}

export const CrmCreatePartyWindowController = hookController<OpenCrmCreatePartyWindowOptions>(useOpenCrmCreatePartyWindow);

export type CrmCreatePartyWindowDefinitionData = OpenCrmCreatePartyWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    crmCreatePartyWindow: OverlayWire<CrmCreatePartyWindowDefinitionData>;
  }
}
