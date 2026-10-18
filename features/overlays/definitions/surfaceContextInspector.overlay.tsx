"use client";

/**
 * Opener for the `surfaceContextInspector` overlay — the live surface
 * value-contract inspector (declared SurfaceValues vs the resolved scope).
 *
 * Renders as a non-blocking WindowPanel (sidebar of keys → closeable tabs).
 * Data-only: surfaceName + the resolved scope + isEditable are plain
 * serializable values, so they travel straight through `openOverlay` data.
 *
 * - `useOpenSurfaceContextInspector()` — imperative hook; returns a `close()` handle.
 * - `<SurfaceContextInspectorController />` — declarative wrapper.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "surfaceContextInspector" as const;

export interface OpenSurfaceContextInspectorOptions {
  surfaceName: string | null;
  /** The live resolved ApplicationScope the menu acts on. */
  scope?: Record<string, unknown>;
  isEditable: boolean;
  /** Prefer the matching page runtime over the supplied snapshot. */
  preferRuntime?: boolean;
}

export interface SurfaceContextInspectorHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createSurfaceContextInspectorOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (
    opts: OpenSurfaceContextInspectorOptions,
  ): SurfaceContextInspectorHandle => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        data: {
          surfaceName: opts.surfaceName,
          scope: opts.scope ?? {},
          isEditable: opts.isEditable,
          preferRuntime: opts.preferRuntime === true,
        },
      }),
    );
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function useOpenSurfaceContextInspector() {
  const store = useAppStore();
  return useMemo(() => createSurfaceContextInspectorOpener(store), [store]);
}

/**
 * Declarative form. Renders nothing visible; opens on mount, closes on unmount.
 */
export function SurfaceContextInspectorController(
  props: OpenSurfaceContextInspectorOptions,
): null {
  const open = useOpenSurfaceContextInspector();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [
    open,
    props.surfaceName,
    props.scope,
    props.isEditable,
    props.preferRuntime,
  ]);
  return null;
}

export type SurfaceContextInspectorDefinitionData = OpenSurfaceContextInspectorOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    surfaceContextInspector: OverlayWire<SurfaceContextInspectorDefinitionData>;
  }
}
