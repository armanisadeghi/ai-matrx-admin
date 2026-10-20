"use client";

/**
 * Opener for the `saveTemplateDialog` overlay — "Save as template": an agent whose variables read
 * the person's tables, those tables and the agents that share them become a template their
 * organization can install.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "saveTemplateDialog" as const;

export interface OpenSaveTemplateDialogOptions {
  /** Start with this agent picked. */
  initialAgentId?: string | null;
  /** Save these tables (a whole base) as the template, with no agent to pick. */
  tableIds?: string[];
  /** The template's starting name (a base's name). */
  name?: string;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createSaveTemplateDialogOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenSaveTemplateDialogOptions = {}) => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        data: {
          initialAgentId: opts.initialAgentId ?? null,
          tableIds: opts.tableIds ?? null,
          name: opts.name ?? null,
        },
      }),
    );
    return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
  };
}

export function useOpenSaveTemplateDialog() {
  const store = useAppStore();
  return useMemo(() => createSaveTemplateDialogOpener(store), [store]);
}

export type SaveTemplateDialogDefinitionData = OpenSaveTemplateDialogOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    saveTemplateDialog: OverlayWire<SaveTemplateDialogDefinitionData>;
  }
}
