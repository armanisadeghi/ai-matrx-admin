"use client";

/**
 * Opener for the `mandateWindow` overlay — the ONE way to open a mandate.
 *
 * 🚨 A mandate is handled IN PLACE (Arman, 2026-08-26). Anywhere the UI names
 * the AI doing a job, the name opens THIS window over the page — never a
 * `<Link>` to `/mandates` or `/administration/intelligence/mandates`, which
 * costs the user the surface they were standing on.
 *
 * Pass the surface's own fixed-job mandate keys as `mandateKeys` so the window
 * opens on the handful that actually run here (and loads only those rows), and `surfaceName` so a
 * note written there records where it came from.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import type { UntypedOverlayWire } from "./overlay-types";
const OVERLAY_ID = "mandateWindow" as const;

/**
 * Which pane the window opens on. Declared HERE, not in the window: an opener
 * may not import a window module (ESLint `no-restricted-imports` — direct
 * imports break the controller's bundle splitting), so the opener owns the
 * shared type and the window imports it.
 */
export type MandateWindowView = "yours" | "admin";

export interface OpenMandateWindowOptions {
  /** The mandate to select on open. */
  initialMandateKey?: AnyMandateKey;
  /** The mandates in scope — fixed jobs this surface actually runs. */
  mandateKeys?: AnyMandateKey[];
  /** The surface the window was opened from. Stamped onto notes written there. */
  surfaceName?: string | null;
  /** Which pane opens first. Defaults to "yours" (works for every user). */
  initialView?: MandateWindowView;
}

export interface MandateWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createMandateWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenMandateWindowOptions = {}): MandateWindowHandle => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        data: {
          initialMandateKey: opts.initialMandateKey,
          mandateKeys: opts.mandateKeys,
          surfaceName: opts.surfaceName ?? undefined,
          initialView: opts.initialView,
        },
      }),
    );
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function useOpenMandateWindow() {
  const store = useAppStore();
  return useMemo(() => createMandateWindowOpener(store), [store]);
}

/** Declarative form — opens on mount, closes on unmount. */
export function MandateWindowController(props: OpenMandateWindowOptions): null {
  const open = useOpenMandateWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
    // Key on the identity fields that change the panel, not on props identity.
  }, [
    open,
    props.initialMandateKey,
    props.surfaceName,
    props.initialView,
    (props.mandateKeys ?? []).join("|"),
  ]);
  return null;
}

export type MandateWindowDefinitionData = OpenMandateWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    mandateWindow: UntypedOverlayWire;
  }
}
