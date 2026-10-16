/**
 * `?debug_view=1` on a run read while the admin debug mode is on (MKT-167 part 2).
 *
 * Arman, 2026-10-15: a provision sits on the server; the client gets only what the
 * screen renders, and full values only in debug mode. The server decides which view
 * a run read gets — an admin who sends this flag gets the events as stored (step
 * arguments, held values by reference) and may call `GET /runs/{id}/values`; every
 * other viewer gets the screen view. A query flag, not a header, so it needs no CORS
 * entry and the two sides ship in either order.
 */

import { getStore } from "@/lib/redux/store-singleton";

export function isRunDebugView(): boolean {
  const state = getStore()?.getState() as { adminDebug?: { isDebugMode?: boolean } } | undefined;
  return Boolean(state?.adminDebug?.isDebugMode);
}

/** `path` with `debug_view=1` added when this tab is in admin debug mode. */
export function withRunDebugView(path: string, debug: boolean = isRunDebugView()): string {
  if (!debug) return path;
  return `${path}${path.includes("?") ? "&" : "?"}debug_view=1`;
}
