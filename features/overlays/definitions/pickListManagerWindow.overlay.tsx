"use client";

/**
 * Opener for the `pickListManagerWindow` overlay.
 *
 * - `useOpenPickListManagerWindow()` — imperative hook. Pass `forcedListId`
 *   to open in single-list mode (switcher hidden); omit it to open the full
 *   browse view.
 * - `<PickListManagerWindowController />` — declarative wrapper. Mount to
 *   open, unmount to close.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "pickListManagerWindow" as const;

export interface OpenPickListManagerWindowOptions {
  title?: string;
  /** When set, opens in single-list mode pinned to this pick list. */
  forcedListId?: string | null;
}

export interface PickListManagerWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createPickListManagerWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (
    opts: OpenPickListManagerWindowOptions = {},
  ): PickListManagerWindowHandle => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        data: {
          title: opts.title,
          forcedListId: opts.forcedListId ?? null,
        },
      }),
    );
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function useOpenPickListManagerWindow() {
  const store = useAppStore();
  return useMemo(() => createPickListManagerWindowOpener(store), [store]);
}

export function PickListManagerWindowController(
  props: OpenPickListManagerWindowOptions,
): null {
  const open = useOpenPickListManagerWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, props.title, props.forcedListId]);
  return null;
}

export type PickListManagerWindowDefinitionData = OpenPickListManagerWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    pickListManagerWindow: OverlayWire<PickListManagerWindowDefinitionData>;
  }
}
