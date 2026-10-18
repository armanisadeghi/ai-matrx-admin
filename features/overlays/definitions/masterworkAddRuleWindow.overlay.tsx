"use client";

/**
 * Opener for the `masterworkAddRuleWindow` overlay — "Add rule" on a Rulebook
 * as a WindowPanel (never a blocking modal). Wires the page's refresh handler
 * through the callback registry, because functions can't travel through Redux.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import {
  createAddRuleCallbackGroup,
  type AddRuleWindowData,
  type AddRuleWindowHandlers,
} from "@/features/window-panels/windows/masterwork/callbacks";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { UntypedOverlayWire } from "./overlay-types";

const OVERLAY_ID = "masterworkAddRuleWindow" as const;

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
  const disposersRef = useRef<Set<() => void>>(new Set());

  useEffect(() => {
    const disposers = disposersRef.current;
    return () => {
      for (const dispose of disposers) dispose();
      disposers.clear();
    };
  }, []);

  return useCallback(
    (opts: OpenAddRuleWindowOptions): AddRuleWindowHandle => {
      const { callbackGroupId, dispose } = createAddRuleCallbackGroup({
        onAdded: opts.onAdded,
        onWindowClose: opts.onWindowClose,
      });
      disposersRef.current.add(dispose);
      const data: AddRuleWindowData = {
        callbackGroupId,
        rulebookId: opts.rulebookId,
        defaultSection: opts.defaultSection ?? null,
      };
      dispatch(openOverlay({ overlayId: OVERLAY_ID, data }));
      return {
        close: () => {
          dispatch(closeOverlay({ overlayId: OVERLAY_ID }));
          dispose();
          disposersRef.current.delete(dispose);
        },
      };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type MasterworkAddRuleWindowDefinitionData = OpenAddRuleWindowOptions;

export const masterworkAddRuleWindowOverlay = /* @__PURE__ */ defineOverlay<MasterworkAddRuleWindowDefinitionData>()({
  id: "masterworkAddRuleWindow",
  label: "Add a rule",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          callbackGroupId: null as string | null,
          rulebookId: null as string | null,
          defaultSection: null as string | null,
        },
    windowId: "masterwork-add-rule-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    masterworkAddRuleWindow: UntypedOverlayWire;
  }
}
