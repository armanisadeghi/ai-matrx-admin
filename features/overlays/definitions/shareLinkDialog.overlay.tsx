"use client";

/**
 * Typed durable opener for the file share-link manager. The overlay controller
 * owns the dialog, so callers may close/unmount transient popovers immediately
 * after dispatch without also destroying the manager.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay } from "@ai-matrx/summon/open";
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

export type ShareLinkDialogDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    shareLinkDialog: OverlayWire<ShareLinkDialogDefinitionData>;
  }
}
