"use client";

/**
 * ResourcePeekRoot — THE app's one resource-peek host, mounted ONCE in `app/Providers.tsx`.
 *
 * It holds the ONLY lazy edge into the peek world (`ResourcePeekHostImpl`: the peek registry, the
 * entity-registry fallback and every bespoke peek), and renders it only after the first
 * `openResourcePeek` of this page load — a page where nobody peeks loads nothing and logs nothing.
 * References never mount a host; they ask through `./resourcePeekStore` (or the declarative
 * `ResourcePeekHost`, which forwards to the same store).
 */

import { useEffect, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import {
  registerResourcePeekHost,
  resourcePeekRequested,
  subscribeResourcePeek,
} from "./resourcePeekStore";

const ResourcePeekStack = dynamic(
  () => import("./ResourcePeekHostImpl").then((m) => m.ResourcePeekStack),
  { ssr: false, loading: () => null },
);

export function ResourcePeekRoot() {
  useEffect(() => registerResourcePeekHost(), []);
  const requested = useSyncExternalStore(subscribeResourcePeek, resourcePeekRequested, () => false);
  return requested ? <ResourcePeekStack /> : null;
}
