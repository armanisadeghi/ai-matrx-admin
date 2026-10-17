"use client";

/**
 * Opener for the `saveToNotesFullscreen` overlay.
 *
 * - `useOpenQuickNoteSaveOverlay()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<QuickNoteSaveOverlayController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "saveToNotesFullscreen" as const;

export interface OpenQuickNoteSaveOverlayOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  initialContent: string;
  bucketTag?: string;
  title?: string;
  /** TODO: tighten to `EditorMode` once that type is imported. */
  initialEditorMode?: unknown;
}

export interface QuickNoteSaveOverlayHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenQuickNoteSaveOverlay() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenQuickNoteSaveOverlayOptions): QuickNoteSaveOverlayHandle => {
      const instanceId = opts.instanceId ?? `saveToNotesFullscreen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          instanceId,
          data: {
            initialContent: opts.initialContent,
            bucketTag: opts.bucketTag,
            title: opts.title,
            initialEditorMode: opts.initialEditorMode,
          },
        }),
      );
      return {
        instanceId,
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId })),
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
export function QuickNoteSaveOverlayController(props: OpenQuickNoteSaveOverlayOptions): null {
  const open = useOpenQuickNoteSaveOverlay();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.initialContent, props.bucketTag, props.title, props.initialEditorMode]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type SaveToNotesFullscreenDefinitionData = OpenQuickNoteSaveOverlayOptions;

export const saveToNotesFullscreenOverlay = defineOverlay<SaveToNotesFullscreenDefinitionData>()({
  id: "saveToNotesFullscreen",
  label: "Save To Notes Fullscreen",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  render: () => import("./saveToNotesFullscreen.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    saveToNotesFullscreen: OverlayWire<SaveToNotesFullscreenDefinitionData>;
  }
}
