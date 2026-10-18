"use client";

// components/ssr/PrepaintScript.tsx — an inline script that runs while the server's HTML is still parsing.
//
// A pre-paint script only does its job in the server's HTML: the browser runs it before React hydrates.
// A script element that a CLIENT render creates never runs, and React says so on every such render
// ("Encountered a script tag while rendering React component") — a list mounted in the browser (the data
// home's cards and toolbar, a client navigation) logged it on every visit. So the script is drawn on the
// server and while hydrating (the same markup the server sent), and never by a client-only render.

import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

/** true on the server and while hydrating; false for every render that happens only in the browser. */
export function useServerOrHydrating(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => false,
    () => true,
  );
}

/** `html` is the script's source; it is the same text on both sides, so hydration never differs. */
export function PrepaintScript({ html }: { html: string }) {
  if (!useServerOrHydrating()) return null;
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}
