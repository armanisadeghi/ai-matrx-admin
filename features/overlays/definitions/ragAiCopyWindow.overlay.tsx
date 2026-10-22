"use client";

import type {
  RagAiCopyBundle,
  RagAiSectionKey,
} from "@/features/rag/components/search/ragAiCopy";
import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "ragAiCopyWindow" as const;

export interface OpenRagAiCopyWindowOptions {
  bundle: RagAiCopyBundle;
  /** When launched from one content block, start focused on that block. */
  initialSections?: RagAiSectionKey[];
}

export interface RagAiCopyWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenRagAiCopyWindowOptions>(OVERLAY_ID, {
  data: (options: OpenRagAiCopyWindowOptions) => ({
            bundle: options.bundle,
            initialSections: options.initialSections ?? null,
          }),
});

export const useOpenRagAiCopyWindow = opener.useOpen;

export const RagAiCopyWindowController = opener.Controller;

export type RagAiCopyWindowDefinitionData = OpenRagAiCopyWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    ragAiCopyWindow: OverlayWire<RagAiCopyWindowDefinitionData>;
  }
}
