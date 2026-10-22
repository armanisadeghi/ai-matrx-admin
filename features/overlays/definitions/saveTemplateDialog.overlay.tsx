"use client";

/**
 * Opener for the `saveTemplateDialog` overlay — "Save as template": an agent whose variables read
 * the person's tables, those tables and the agents that share them become a template their
 * organization can install.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

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
const opener = appOpener<OpenSaveTemplateDialogOptions>(OVERLAY_ID, {
  data: (opts: OpenSaveTemplateDialogOptions = {}) => ({
          initialAgentId: opts.initialAgentId ?? null,
          tableIds: opts.tableIds ?? null,
          name: opts.name ?? null,
        }),
});

export const createSaveTemplateDialogOpener = opener.forStore;

export const useOpenSaveTemplateDialog = opener.useOpen;

export type SaveTemplateDialogDefinitionData = OpenSaveTemplateDialogOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    saveTemplateDialog: OverlayWire<SaveTemplateDialogDefinitionData>;
  }
}
