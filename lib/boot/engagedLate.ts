// lib/boot/engagedLate.ts — THE ENGAGED-LATE TIER.
//
// Owner rule (Arman, 2026-10-17): before the person engages the page, a load makes only the core
// reads (the layout's few, the route's one or two, the shell's ONE lazy count read). Everything
// informational — the assists list, "needs you", the DM badge, announcements, the web-app notice
// and version check, the age-band nudge, config attestation, the approvals badge — waits for BOTH:
// the page has fully settled (lib/boot/lateIdle) AND the person has engaged it (a trusted press,
// key or touch — lib/boot/firstEngagement). A page nobody touches makes none of these reads.
// The late-idle half keeps the engagement itself (the first keystroke of "hello") free of a burst.
"use client";

import { useEffect, useState } from "react";
import { whenEngaged } from "./firstEngagement";
import { whenLateIdle, LATE_IDLE_DELAY_MS } from "./lateIdle";

/** Resolves true once the page has settled AND been engaged; false when aborted first. */
export async function whenEngagedLate(delayMs = LATE_IDLE_DELAY_MS, signal?: AbortSignal): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const settled = await whenLateIdle(delayMs, signal);
  if (!settled || signal?.aborted) return false;
  await Promise.race([
    whenEngaged(),
    new Promise<void>((resolve) => signal?.addEventListener("abort", () => resolve(), { once: true })),
  ]);
  return !signal?.aborted;
}

/** `true` once the page has settled AND been engaged. One re-render: false → true. */
export function useEngagedLateReady(delayMs = LATE_IDLE_DELAY_MS): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready) return;
    const controller = new AbortController();
    void whenEngagedLate(delayMs, controller.signal).then((ok) => {
      if (ok) setReady(true);
    });
    return () => controller.abort();
  }, [ready, delayMs]);
  return ready;
}
