"use client";

/**
 * Opener for the `masterworkAddRuleWindow` overlay — "Add rule" on a Rulebook
 * as a WindowPanel (never a blocking modal). Wires the page's refresh handler
 * through the callback registry, because functions can't travel through Redux.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  createAddRuleCallbackGroup,
  type AddRuleWindowData,
  type AddRuleWindowHandlers,
} from "@/features/window-panels/windows/masterwork/callbacks";
import type { UntypedOverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";

const OVERLAY_ID = "masterworkAddRuleWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

export interface OpenAddRuleWindowOptions extends AddRuleWindowHandlers {
  /** The Rulebook the rule lands on. The window is meaningless without it. */
  rulebookId: string;
  /** Pre-select a section (the "Add here" entry point). */
  defaultSection?: string | null;
}

export interface AddRuleWindowHandle {
  close: () => void;
}

export function useOpenAddRuleWindow() {
  const dispatch = useAppDispatch();

  // The opened window owns its callback group (it releases it on close / its own window-close
  // event); this hook never drops it on unmount — a menu or sheet that opened the window unmounts
  // first (an-opened-window-owns-its-callback-group.test.ts).

  return useCallback(
    (opts: OpenAddRuleWindowOptions): AddRuleWindowHandle => {
      const { callbackGroupId, dispose } = createAddRuleCallbackGroup({
        onAdded: opts.onAdded,
        onWindowClose: opts.onWindowClose,
      });
      const data: AddRuleWindowData = {
        callbackGroupId,
        rulebookId: opts.rulebookId,
        defaultSection: opts.defaultSection ?? null,
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

export type MasterworkAddRuleWindowDefinitionData = OpenAddRuleWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    masterworkAddRuleWindow: UntypedOverlayWire;
  }
}
