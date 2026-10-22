"use client";

/**
 * Opener for the `linkRecordSheet` overlay — "Link a record…" on any record the right-click menu
 * targets (`features/rich-document/annotations/LinkRecordOverlay.tsx`). Data-only: the target is a
 * plain serializable `{ token, id, title }`. Mirrors `contextAssignment`.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "linkRecordSheet" as const;

export interface OpenLinkRecordSheetOptions {
  /** `tableId` / `organizationId`: a store record's, so record ↔ record links through its columns. */
  target: { token: string; id: string; title: string; tableId?: string; organizationId?: string };
}

const opener = appOpener<OpenLinkRecordSheetOptions>(OVERLAY_ID);

export const useOpenLinkRecordSheet = opener.useOpen;

export type LinkRecordSheetDefinitionData = OpenLinkRecordSheetOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    linkRecordSheet: OverlayWire<LinkRecordSheetDefinitionData>;
  }
}
