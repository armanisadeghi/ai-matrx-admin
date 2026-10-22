"use client";

/**
 * Opener for the `mandateWindowNext` overlay — the NEW mandate window, built
 * beside `mandateWindow` while the owner compares them. Existing call sites
 * keep `useOpenMandateWindow`; nothing is repointed here.
 *
 * The window always lists every mandate the viewer can see; `initialMandateKey`
 * only chooses which one is selected, and `initialTab` which tab opens.
 */

import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import type { UntypedOverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "mandateWindowNext" as const;

export interface OpenMandateWindowNextOptions {
  /** The mandate to select on open (key). */
  initialMandateKey?: AnyMandateKey;
  /** The tab to open on (a record tab id, e.g. "holder"). */
  initialTab?: string;
}

export interface MandateWindowNextHandle {
  close: () => void;
}

const opener = appOpener<OpenMandateWindowNextOptions>(OVERLAY_ID, {
  data: (opts: OpenMandateWindowNextOptions = {}) => ({
            initialMandateKey: opts.initialMandateKey ?? null,
            initialTab: opts.initialTab ?? null,
          }),
});

export const useOpenMandateWindowNext = opener.useOpen;

/** Declarative form — opens on mount, closes on unmount. */
export const MandateWindowNextController = opener.Controller;

export type MandateWindowNextDefinitionData = OpenMandateWindowNextOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    mandateWindowNext: UntypedOverlayWire;
  }
}
