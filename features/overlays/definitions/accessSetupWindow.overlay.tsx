"use client";

/**
 * Opener for the `accessSetupWindow` overlay — the People involved panel (features/access-setup).
 *
 * - `useOpenAccessSetupWindow()` — imperative hook; returns a handle with `close()`.
 * - `<AccessSetupWindowController />` — declarative: open on mount, close on unmount.
 *
 * Pass `recordId` for one record, or `cycleId` for a bulk creation (one panel for the cycle).
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "accessSetupWindow" as const;

export interface OpenAccessSetupWindowOptions {
  headType: string;
  recordId?: string | null;
  cycleId?: string | null;
  recordName?: string | null;
}

export interface AccessSetupWindowHandle {
  close: () => void;
}

export function useOpenAccessSetupWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAccessSetupWindowOptions): AccessSetupWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            headType: opts.headType,
            recordId: opts.recordId ?? null,
            cycleId: opts.cycleId ?? null,
            recordName: opts.recordName ?? null,
          },
        }),
      );
      return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
    },
    [dispatch],
  );
}

export function AccessSetupWindowController(props: OpenAccessSetupWindowOptions): null {
  const open = useOpenAccessSetupWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.headType, props.recordId, props.cycleId, props.recordName]);
  return null;
}

export type AccessSetupWindowDefinitionData = OpenAccessSetupWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    accessSetupWindow: OverlayWire<AccessSetupWindowDefinitionData>;
  }
}
