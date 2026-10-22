"use client";

/**
 * Opener for the `researchContextPreviewWindow` overlay.
 *
 * Only the bundle DESCRIPTOR travels through Redux — the window resolves it
 * into the actual payload itself. A resolved research context routinely runs
 * to 300k+ characters; putting that in the store (and in every devtools
 * snapshot) to render a preview would be the wrong trade.
 *
 * Singleton: opening it again for a different selection retargets the same
 * window rather than stacking copies.
 */

import type { ContextBundle } from "@/features/research/resources/types";
import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "researchContextPreviewWindow" as const;

export interface OpenResearchContextPreviewOptions {
  topicId: string;
  /** The selection to resolve — rules, not resolved text. */
  bundle: ContextBundle;
  /** Shown in the action bar's save/export names. */
  title?: string;
}

export interface ResearchContextPreviewHandle {
  close: () => void;
}

const opener = appOpener<OpenResearchContextPreviewOptions>(OVERLAY_ID);

export const useOpenResearchContextPreview = opener.useOpen;

export type ResearchContextPreviewWindowDefinitionData = OpenResearchContextPreviewOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    researchContextPreviewWindow: OverlayWire<ResearchContextPreviewWindowDefinitionData>;
  }
}
