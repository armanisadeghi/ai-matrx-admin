"use client";

/**
 * Typed durable opener for the file share-link manager. The overlay controller
 * owns the dialog, so callers may close/unmount transient popovers immediately
 * after dispatch without also destroying the manager.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "shareLinkDialog" as const;

interface OpenShareLinkDialogOptions {
  resourceId: string;
}

export function useOpenShareLinkDialog() {
  const dispatch = useAppDispatch();
  return useCallback(
    ({ resourceId }: OpenShareLinkDialogOptions) => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: { resourceId },
        }),
      );
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ShareLinkDialogDefinitionData = Record<string, unknown>;

export const shareLinkDialogOverlay = defineOverlay<ShareLinkDialogDefinitionData>()({
  id: "shareLinkDialog",
  label: "Manage Share Links",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  render: () => import("./shareLinkDialog.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    shareLinkDialog: OverlayWire<ShareLinkDialogDefinitionData>;
  }
}
