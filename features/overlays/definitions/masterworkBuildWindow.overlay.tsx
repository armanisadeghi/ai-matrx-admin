"use client";

/**
 * Opener for the `masterworkBuildWindow` overlay — "Build a Masterwork" on a
 * Rulebook as a WindowPanel (never a blocking modal). Wires the page's
 * Masterworks-list refresh through the callback registry, because functions
 * can't travel through Redux.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import {
  createBuildCallbackGroup,
  type BuildWindowData,
  type BuildWindowHandlers,
} from "@/features/masterwork/build/callbacks";
import type { UntypedOverlayWire } from "./overlay-types";

const OVERLAY_ID = "masterworkBuildWindow" as const;

export interface OpenBuildWindowOptions extends BuildWindowHandlers {
  /** The Rulebook being built from. The window is meaningless without it. */
  rulebookId: string;
}

export interface BuildWindowHandle {
  close: () => void;
}

export function useOpenBuildWindow() {
  const dispatch = useAppDispatch();

  // The opened window owns its callback group (it releases it on close / its own window-close
  // event); this hook never drops it on unmount — a menu or sheet that opened the window unmounts
  // first (an-opened-window-owns-its-callback-group.test.ts).

  return useCallback(
    (opts: OpenBuildWindowOptions): BuildWindowHandle => {
      const { callbackGroupId, dispose } = createBuildCallbackGroup({
        onBuilt: opts.onBuilt,
        onWindowClose: opts.onWindowClose,
      });
      const data: BuildWindowData = {
        callbackGroupId,
        rulebookId: opts.rulebookId,
      };
      dispatch(openOverlay({ overlayId: OVERLAY_ID, data }));
      return {
        close: () => {
          dispatch(closeOverlay({ overlayId: OVERLAY_ID }));
          dispose();
        },
      };
    },
    [dispatch],
  );
}

export function BuildWindowController(props: OpenBuildWindowOptions): null {
  const open = useOpenBuildWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.rulebookId]);
  return null;
}

export type MasterworkBuildWindowDefinitionData = OpenBuildWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    masterworkBuildWindow: UntypedOverlayWire;
  }
}
