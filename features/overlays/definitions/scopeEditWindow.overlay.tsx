"use client";

/**
 * Opener for the `scopeEditWindow` overlay — a draggable window panel that
 * creates or edits a single Scope (reusing the shared `ScopeForm` core).
 *
 * - `useOpenScopeEditWindow()` — imperative hook; returns a `close()` handle.
 * - `<ScopeEditWindowController />` — declarative wrapper (mount = open).
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { ScopeEditWindowData } from "@/features/window-panels/windows/context-scopes/ScopeEditWindow";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "scopeEditWindow" as const;

export type OpenScopeEditWindowOptions = ScopeEditWindowData;

export interface ScopeEditWindowHandle {
  close: () => void;
}

export function useOpenScopeEditWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenScopeEditWindowOptions): ScopeEditWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            scopeId: opts.scopeId ?? null,
            scopeTypeId: opts.scopeTypeId,
            organizationId: opts.organizationId,
            parentScopeId: opts.parentScopeId ?? null,
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

export function ScopeEditWindowController(
  props: OpenScopeEditWindowOptions,
): null {
  const open = useOpenScopeEditWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.scopeId, props.scopeTypeId, props.organizationId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ScopeEditWindowDefinitionData = OpenScopeEditWindowOptions;

export const scopeEditWindowOverlay = /* @__PURE__ */ defineOverlay<ScopeEditWindowDefinitionData>()({
  id: "scopeEditWindow",
  label: "Scope Editor",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          scopeId: null,
          scopeTypeId: null,
          organizationId: null,
          parentScopeId: null,
        },
    windowId: "scope-edit-window",
    mobile: "drawer",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    scopeEditWindow: OverlayWire<ScopeEditWindowDefinitionData>;
  }
}
