"use client";

/**
 * What only matters once windows can exist, mounted by <SummonRoot> after the summon core loads
 * (first open, a page's WindowPanel, a `?panels=` link or saved windows): the viewport/tray sync
 * and the Next router port. One import() of this whole set; never in a route's first load.
 */
import { Suspense, useEffect } from "react";
import { useNextRouterPort } from "@ai-matrx/summon/next";
import { WindowTraySync } from "@ai-matrx/summon/window-host";
import { setAppRouterPort } from "./appRouterPort";

/** useNextRouterPort reads search params, so it sits in its own Suspense island. */
function RouterPortBridge() {
  const port = useNextRouterPort();
  useEffect(() => setAppRouterPort(port), [port]);
  return null;
}

export default function AppSummonRuntime() {
  return (
    <>
      <Suspense fallback={null}>
        <RouterPortBridge />
      </Suspense>
      <WindowTraySync />
    </>
  );
}
