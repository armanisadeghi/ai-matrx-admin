"use client";

/**
 * Opener for the `provisionWindow` overlay — the Provision window (features/provision-window).
 * `openProvisionWindow(snapshotId)` shows one saved capture of a call point's values.
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */
import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";

const OVERLAY_ID = "provisionWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

export function useOpenProvisionWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (snapshotId: string, title?: string) => {
      opener.open(dispatch, { data: { snapshotId, title } });
      return { close: () => dispatch(opener.close()) };
    },
    [dispatch],
  );
}

export type ProvisionWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    provisionWindow: OverlayWire<ProvisionWindowDefinitionData>;
  }
}
