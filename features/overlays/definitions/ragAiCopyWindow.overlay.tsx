"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type {
  RagAiCopyBundle,
  RagAiSectionKey,
} from "@/features/rag/components/search/ragAiCopy";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "ragAiCopyWindow" as const;

export interface OpenRagAiCopyWindowOptions {
  bundle: RagAiCopyBundle;
  /** When launched from one content block, start focused on that block. */
  initialSections?: RagAiSectionKey[];
}

export interface RagAiCopyWindowHandle {
  close: () => void;
}

export function useOpenRagAiCopyWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (options: OpenRagAiCopyWindowOptions): RagAiCopyWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            bundle: options.bundle,
            initialSections: options.initialSections ?? null,
          },
        }),
      );
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

export function RagAiCopyWindowController(
  props: OpenRagAiCopyWindowOptions,
): null {
  const open = useOpenRagAiCopyWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.bundle, props.initialSections]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type RagAiCopyWindowDefinitionData = OpenRagAiCopyWindowOptions;

export const ragAiCopyWindowOverlay = /* @__PURE__ */ defineOverlay<RagAiCopyWindowDefinitionData>()({
  id: "ragAiCopyWindow",
  label: "Copy Knowledge Result for AI",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { bundle: null, initialSections: null },
    windowId: "rag-ai-copy-window",
    mobile: "drawer",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    ragAiCopyWindow: OverlayWire<RagAiCopyWindowDefinitionData>;
  }
}
