"use client";

/**
 * Opener for the `alchemyPrepareWindow` overlay: one Alchemy preparation session drawn in a real
 * window (PP-01a), several at once. Callers never open it directly: the web app's `WindowPort`
 * (components/agent-copy/alchemyWindowPort.ts) does, after registering the session's live render
 * closure as a summon handle whose id is the only open data.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

export interface AlchemyPrepareWindowOptions {
  /** The window's identity; the port mints one per session when the package names none. */
  instanceId?: string;
  /** The summon handle id of the session's live render (never serialized; dies with the page). */
  handleId: string;
}

export const alchemyPrepareWindowOpener = appOpener<AlchemyPrepareWindowOptions>("alchemyPrepareWindow", {
  multi: true,
});

export type AlchemyPrepareWindowDefinitionData = Omit<AlchemyPrepareWindowOptions, "instanceId">;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    alchemyPrepareWindow: OverlayWire<AlchemyPrepareWindowDefinitionData>;
  }
}
