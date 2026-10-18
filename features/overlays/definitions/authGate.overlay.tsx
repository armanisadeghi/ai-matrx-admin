"use client";

/**
 * Opener for the `authGate` overlay.
 *
 * - `useOpenAuthGateDialog()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AuthGateDialogController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "authGate" as const;

export interface OpenAuthGateDialogOptions {
  featureName?: string;
  featureDescription?: string;
}

export interface AuthGateDialogHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createAuthGateDialogOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenAuthGateDialogOptions = {}): AuthGateDialogHandle => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        data: {
          featureName: opts.featureName,
          featureDescription: opts.featureDescription,
        },
      }),
    );
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function useOpenAuthGateDialog() {
  const store = useAppStore();
  return useMemo(() => createAuthGateDialogOpener(store), [store]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function AuthGateDialogController(props: OpenAuthGateDialogOptions): null {
  const open = useOpenAuthGateDialog();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.featureName, props.featureDescription]);
  return null;
}

export type AuthGateDefinitionData = OpenAuthGateDialogOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    authGate: OverlayWire<AuthGateDefinitionData>;
  }
}
