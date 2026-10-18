"use client";

/**
 * Opener for the `quickNoteSaveWindow` overlay.
 *
 * - `useOpenQuickNoteSaveWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<QuickNoteSaveWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "quickNoteSaveWindow" as const;

export interface OpenQuickNoteSaveWindowOptions {
  initialContent?: string;
  bucketTag?: string;
  defaultNoteName?: string;
  /** TODO: tighten to `EditorMode` once that type is imported. */
  initialEditorMode?: unknown;
}

export interface QuickNoteSaveWindowHandle {
  close: () => void;
}

export function useOpenQuickNoteSaveWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenQuickNoteSaveWindowOptions = {}): QuickNoteSaveWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            initialContent: opts.initialContent,
            bucketTag: opts.bucketTag,
            defaultNoteName: opts.defaultNoteName,
            initialEditorMode: opts.initialEditorMode,
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

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function QuickNoteSaveWindowController(
  props: OpenQuickNoteSaveWindowOptions,
): null {
  const open = useOpenQuickNoteSaveWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [
    open,
    props.initialContent,
    props.bucketTag,
    props.defaultNoteName,
    props.initialEditorMode,
  ]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type QuickNoteSaveWindowDefinitionData = OpenQuickNoteSaveWindowOptions;

export const quickNoteSaveWindowOverlay = /* @__PURE__ */ defineOverlay<QuickNoteSaveWindowDefinitionData>()({
  id: "quickNoteSaveWindow",
  label: "Quick Note Save Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialContent: "" },
    windowId: "quick-note-save-window",
    mobile: "drawer",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    quickNoteSaveWindow: OverlayWire<QuickNoteSaveWindowDefinitionData>;
  }
}
