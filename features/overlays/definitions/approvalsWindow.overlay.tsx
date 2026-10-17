"use client";

/**
 * Opener for the `approvalsWindow` overlay — THE approval queue as a window.
 *
 * - `useOpenApprovalsWindow()` — imperative hook; returns a handle with `close()`.
 * - `<ApprovalsWindowController />` — declarative: mount to open, unmount to close.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "approvalsWindow" as const;

export interface ApprovalsWindowHandle {
  close: () => void;
}

export function useOpenApprovalsWindow() {
  const dispatch = useAppDispatch();
  return useCallback((): ApprovalsWindowHandle => {
    dispatch(openOverlay({ overlayId: OVERLAY_ID }));
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  }, [dispatch]);
}

export function ApprovalsWindowController(): null {
  const open = useOpenApprovalsWindow();
  useEffect(() => {
    const handle = open();
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ApprovalsWindowDefinitionData = Record<string, unknown>;

export const approvalsWindowOverlay = defineOverlay<ApprovalsWindowDefinitionData>()({
  id: "approvalsWindow",
  label: "Waiting on you",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "approvals-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
  link: {
    key: "approvals",
    hydrate: (ctx) => import("./approvalsWindow.link").then((m) => m.hydrate(ctx)),
  },
  render: () => import("./approvalsWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    approvalsWindow: OverlayWire<ApprovalsWindowDefinitionData>;
  }
}
