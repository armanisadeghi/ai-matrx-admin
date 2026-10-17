"use client";

/**
 * <LoadMark name="Sidebar" /> — the load-trace "RENDERED" line for a SERVER component (which never
 * runs in the browser, so it cannot call useLoadMark). Renders nothing; the line fires when this
 * island hydrates and reads "server HTML, hydrated". Client components call useLoadMark directly.
 */

import { useLoadMark, type LoadMarkKind } from "./loadMark";

export function LoadMark({ name, kind = "render" }: { name: string; kind?: LoadMarkKind }): null {
  useLoadMark(name, kind, { hydrated: true });
  return null;
}
