"use client";

/**
 * Opener for the `listManagerWindow` overlay.
 *
 * - `useOpenListManagerWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ListManagerWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "listManagerWindow" as const;

export interface OpenListManagerWindowOptions {
  title?: string;
}

export interface ListManagerWindowHandle {
  close: () => void;
}

export function useOpenListManagerWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenListManagerWindowOptions = {}): ListManagerWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            title: opts.title,
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
export function ListManagerWindowController(props: OpenListManagerWindowOptions): null {
  const open = useOpenListManagerWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.title]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ListManagerWindowDefinitionData = OpenListManagerWindowOptions;

export const listManagerWindowOverlay = defineOverlay<ListManagerWindowDefinitionData>()({
  id: "listManagerWindow",
  label: "List Manager Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { activeListId: null },
    windowId: "list-manager-window",
    mobile: "fullscreen",
  },
  link: {
    key: "listManager",
    hydrate: (ctx) => import("./listManagerWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    listManagerWindow: OverlayWire<ListManagerWindowDefinitionData>;
  }
}
