"use client";

/**
 * useBoundedWait — a waiting state that can only be true while real work is in
 * flight, and never longer than `limitMs`.
 *
 * WHY SHARED (THE PLATFORM-PRIMITIVE RULE): a shimmer, skeleton or "working"
 * line is a claim that something is coming. Fed from a broad flag ("the run is
 * busy") it shimmered for 14 minutes over a picture nobody was taking (Arman,
 * 2026-10-14: "we shouldn't lie and show it loading"). Every placeholder passes
 * the flag of the ONE job that fills it, and this hook ends the claim when the
 * job outlives its limit (a dead stream never sends "done"), so the slot
 * resolves to its honest empty state instead of waiting forever.
 *
 * The clock restarts each time `active` turns true again.
 */

import { useEffect, useState } from "react";

export function useBoundedWait(active: boolean, limitMs: number): boolean {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setExpired(true), limitMs);
    return () => {
      clearTimeout(timer);
      setExpired(false);
    };
  }, [active, limitMs]);
  return active && !expired;
}
