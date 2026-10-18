"use client";

/**
 * Opener for the `saveTemplateDialog` overlay — "Save as template": an agent whose variables read
 * the person's tables, those tables and the agents that share them become a template their
 * organization can install.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "saveTemplateDialog" as const;

export interface OpenSaveTemplateDialogOptions {
  /** Start with this agent picked. */
  initialAgentId?: string | null;
}

export function useOpenSaveTemplateDialog() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenSaveTemplateDialogOptions = {}) => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            initialAgentId: opts.initialAgentId ?? null,
          },
        }),
      );
      return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
    },
    [dispatch],
  );
}

export type SaveTemplateDialogDefinitionData = OpenSaveTemplateDialogOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    saveTemplateDialog: OverlayWire<SaveTemplateDialogDefinitionData>;
  }
}
