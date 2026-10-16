"use client";

// DeferredSingletonWrapper — the ONLY entry point for the new deferred-
// singleton tree (successor to `app/DeferredSingletons.tsx`, built on the
// `components/MarkdownStream.tsx` shell/impl pattern).
//
// The split contract:
//   - THIS file is the thin client shell. It holds every gate: client-only
//     mount (useEffect), page-idle readiness, and the `next/dynamic`
//     (ssr: false) boundary that keeps the core's entire module graph out
//     of the server render and out of every route's static dep graph.
//   - `DeferredSingletonCore.tsx` is the full body. It does NO dynamic
//     imports and NO render conditions — it statically imports and
//     directly renders every singleton.
//
// The core is never rendered before the client guard resolves: `mounted`
// flips only in a browser effect, and `useIdleReady` holds it back until
// the page has gone idle, so the core chunk is not even requested during
// boot/hydration.

// Side-effect import: schedules the bundle-leak guard's boot-end macrotask
// during the CLIENT boot bundle. This MUST live in a statically-imported
// `"use client"` module (this shell), NOT in the dynamically-loaded core —
// if the guard first evaluates inside the lazy core chunk, it lands in the
// same synchronous turn as the registry/OverlaySurface modules and
// false-positives on legitimate lazy loads.
import "@/features/window-panels/utils/lazy-bundle-guard";
// Side-effect import: registers every Matrx `svg:` public asset into
// @ai-matrx/icons' injectable registry at client-bundle eval — before any
// component resolves an `svg:` icon value. The package ships EMPTY; without
// this the icons would silently fall back.
import "@/utils/icons/matrx-public-svg-registry";
// Side-effect import: registers next/link into @ai-matrx/tap-target's link
// registry. This client module also executes during the SSR pass, so both
// server render and hydration resolve the same link element; a Server
// Component must never import the setup module (client-reference call).
import "@/components/icons/tap-target-setup";
// Side-effect import: registers the app's Monaco wrapper as @ai-matrx/diff's
// HEAVY diff renderer. The package ships a complete light diff without it, so
// this is an upgrade (syntax highlighting + editor virtualisation for source
// code and very large inputs), never a prerequisite.
import "@/components/diff/heavy-renderer-setup";

import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";
import { registerIdleTask, useIdleReady } from "@ai-matrx/kit/idle-scheduler";
import { useAppSelector } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/rootReducer";
import {
  personPeekRequested,
  subscribePersonPeek,
} from "@/features/data-tables/records-ui-host/personPeekStore";
import { installFirstEngagementListeners } from "@/lib/boot/firstEngagement";
import { installGlobalErrorCapture } from "@/lib/diagnostics/globalErrorCapture";
import { installErrorPersistence } from "@/lib/diagnostics/persistCapturedErrors";

// Install the global error listeners at MODULE scope, not in the effect below.
// React reports hydration mismatches (minified errors #418/#423/#425) through
// `console.error` DURING hydration — which is strictly before any effect runs.
// An effect-time install therefore cannot see the single most common
// production-only error class, and the Error Inspector recorded nothing while
// the browser console showed #418 on every marketing route (2026-08-11
// investigation: the error was visible in Arman's console and structurally
// invisible to our own diagnostics).
//
// This module is already statically imported into every route's client boot
// bundle, so module-scope evaluation happens as that bundle loads — before
// `hydrateRoot`. `installGlobalErrorCapture` is idempotent and returns
// immediately when `window` is undefined, so the SSR pass of this client
// module is a no-op.
installGlobalErrorCapture();
// The engagement tier (lib/boot/firstEngagement.ts) must see a click or key press made BEFORE the
// deferred core loads, so its listeners go on here, at boot-bundle evaluation.
installFirstEngagementListeners();

// LOAD MARKER (core) — the signed-in boot bundle evaluated; page-load trace, no import.
if (typeof window !== "undefined") performance.mark("load:core:app boot bundle");

// REAL-USER PAGE SPEED (lib/diagnostics/pageVitalsReporter.ts): one row per page load, loaded as the
// LAST idle task after the page settles — first paint never pays for it.
if (typeof window !== "undefined") {
  registerIdleTask("matrx-page-vitals", 5, () =>
    import("@/lib/diagnostics/pageVitalsReporter").then((m) => m.startPageVitals()),
  );
}

const DeferredSingletonCore = dynamic(
  () => import("./DeferredSingletonCore"),
  { ssr: false, loading: () => null },
);

// THE OVERLAY WORLD — one edge, loaded on the first open, never at idle. See DeferredOverlayWorld.tsx.
const DeferredOverlayWorld = dynamic(
  () => import("./DeferredOverlayWorld"),
  { ssr: false, loading: () => null },
);

/** Any overlay currently in the slice (a key is added on open; closing the last instance removes it). */
const selectAnyOverlayTouched = (state: RootState) =>
  Object.keys(state.overlays.overlays).length > 0;

/** Latches true on the first overlay open or person-peek request. */
export function useOverlayWorldWanted(): boolean {
  const overlayTouched = useAppSelector(selectAnyOverlayTouched);
  const peekRequested = useSyncExternalStore(
    subscribePersonPeek,
    personPeekRequested,
    () => false,
  );
  const [latched, setLatched] = useState(false);
  const wanted = overlayTouched || peekRequested;
  // Latch during render (React's "adjust state on a prop change" pattern): closing the last overlay
  // deletes its key, and the controller must stay mounted once loaded.
  if (wanted && !latched) setLatched(true);
  return latched || wanted;
}

export default function DeferredSingletonWrapper() {
  const [mounted, setMounted] = useState(false);
  const idle = useIdleReady();
  const ready = idle;

  // Error capture itself is installed at module scope above (pre-hydration).
  // Persistence stays here: it writes to Supabase and has nothing to gain from
  // running before the client tree exists.
  useEffect(() => {
    // Persist red-tier captures to public.system_error (canonical sink) —
    // self-gates to production + authenticated; deduped + throttled. See
    // lib/diagnostics/persistCapturedErrors.ts.
    installErrorPersistence();
    setMounted(true);
  }, []);

  const overlayWorldWanted = useOverlayWorldWanted();

  if (!mounted) return null;

  return (
    <>
      {ready ? <DeferredSingletonCore /> : null}
      {overlayWorldWanted ? <DeferredOverlayWorld /> : null}
    </>
  );
}
