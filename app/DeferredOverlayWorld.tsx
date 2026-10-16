"use client";

// DeferredOverlayWorld — the overlay world: everything that renders NOTHING until something is
// opened by dispatch (OverlayController's ~90 overlays and windows) or by the records host
// (PersonPeekHost). Loaded through ONE `next/dynamic` edge in `app/DeferredSingletonWrapper.tsx`,
// on the first `openOverlay` / `toggleOverlay` (any key in `state.overlays.overlays`) or the first
// `openPersonPeek` — never at idle (owner rule, 2026-10-16: nothing is pulled in until something
// engages with it). The open request is redux / store state, so an open dispatched while this
// chunk downloads is rendered the moment the controller mounts; nothing is lost.
//
// Same rules as DeferredSingletonCore: static imports only, no render conditions here.

import OverlayController from "@/features/overlays/OverlayController";
import { PersonPeekHost } from "@/features/data-tables/records-ui-host/PersonPeekHost";

// LOAD MARKER (heavy: must never load before the person engages) — read by the page-load trace; no import, no build edge.
if (typeof window !== "undefined") performance.mark("load:heavy:Overlay world");

export default function DeferredOverlayWorld() {
  return (
    <>
      <OverlayController />
      {/* A person a table names opens in place (records-ui `openPerson`). */}
      <PersonPeekHost />
    </>
  );
}
