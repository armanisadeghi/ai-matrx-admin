"use client";

// lib/scoped-config/paintedOrganization.ts — lane SHELL-DEDUPE
//
// A PAINTED ORGANIZATION IS NOT AN ANSWER YET.
//
// `appContextSlice` fills an empty tab from the browser cache so the sidebar shows something at once,
// and says outright that this "only paints — no request leaves on it": the load ladder's answer (the
// account's last active organization) wins a moment later. A knob read on the painted organization
// is one wasted `knob_snapshot_delta` for an organization the person then leaves. So a read keyed to
// the organization the store is still only painting waits for the ladder; every other organization
// (a page's own, an explicit one, none) is asked at once.

import { useContext, useEffect, useState, useSyncExternalStore } from "react";

/** A surface that never runs the load ladder (no shell) must not hold its reads forever. */
const HOLD_CAP_MS = 4_000;
import { ReactReduxContext } from "react-redux";

type StateWithContext = { appContext?: { organization_id?: string | null; orgBootstrapResolved?: boolean } };

export function isOnlyPainted(organizationId: string | null | undefined, state: StateWithContext): boolean {
  const context = state.appContext;
  if (!context || context.orgBootstrapResolved !== false) return false;
  // NO ORGANIZATION YET IS NOT AN ANSWER EITHER (2026-10-13). A reader that passes the active
  // organization reads `null` for the moment before the ladder answers, then the real one: two
  // `knob_snapshot_delta` reads per load, on every page (the Builder's Page load tab showed both,
  // `p_organization_id: null` then the org). It waits for the ladder like a painted one.
  if (!organizationId) return true;
  return context.organization_id === organizationId;
}

/**
 * True while `organizationId` is the organization the store has only painted from its cache — or is
 * absent while the ladder has not answered yet.
 */
export function usePaintedOrganizationHeld(organizationId: string | null | undefined): boolean {
  const store = useContext(ReactReduxContext)?.store;
  const [capped, setCapped] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setCapped(true), HOLD_CAP_MS);
    return () => clearTimeout(timer);
  }, []);
  const held = useSyncExternalStore(
    (listener) => (store ? store.subscribe(listener) : () => {}),
    () => (store ? isOnlyPainted(organizationId, store.getState() as StateWithContext) : false),
    () => false,
  );
  return held && !capped;
}
