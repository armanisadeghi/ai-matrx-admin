"use client";

/**
 * Opener for the `masterworkBuildWindow` overlay — "Build a Masterwork" on a
 * Rulebook as a WindowPanel (never a blocking modal). Wires the page's
 * Masterworks-list refresh through the callback registry, because functions
 * can't travel through Redux.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  createBuildCallbackGroup,
  type BuildWindowData,
  type BuildWindowHandlers,
} from "@/features/masterwork/build/callbacks";
import type { UntypedOverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./app-opener";

const OVERLAY_ID = "masterworkBuildWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

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
      opener.open(dispatch, { data });
      return {
        close: () => {
          dispatch(opener.close());
          dispose();
        },
      };
    },
    [dispatch],
  );
}

export const BuildWindowController = hookController<OpenBuildWindowOptions>(useOpenBuildWindow);

export type MasterworkBuildWindowDefinitionData = OpenBuildWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    masterworkBuildWindow: UntypedOverlayWire;
  }
}
