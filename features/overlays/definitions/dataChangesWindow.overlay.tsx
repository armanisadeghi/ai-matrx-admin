"use client";

/**
 * Opener for the `dataChangesWindow` overlay (singleton): what a refresh of a fetched table changed
 * (New / Changed / Gone) and the table's refresh history. Opening another table replaces the one showing.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "dataChangesWindow" as const;

export interface OpenDataChangesOptions {
  tableId: string;
  organizationId: string | null;
  /** The refresh to show first; the newest when left out. */
  jobId?: string | null;
  tableName?: string | null;
}

export interface DataChangesWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenDataChangesOptions>(OVERLAY_ID);

export const useOpenDataChangesWindow = opener.useOpen;

export type DataChangesWindowDefinitionData = OpenDataChangesOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    dataChangesWindow: OverlayWire<DataChangesWindowDefinitionData>;
  }
}
