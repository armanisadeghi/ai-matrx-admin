"use client";

/**
 * LegacyPromptOverlaysController — thin client shell.
 *
 * Statically importable from anywhere. The body
 * (`LegacyPromptOverlaysControllerImpl.tsx`) statically pulls in 24+
 * `promptRunnerSlice` selectors/actions plus a socket-io selector, then
 * `dynamic()`s 7 overlay components. By deferring all of that behind a
 * `next/dynamic` boundary at this shell, none of those imports enter
 * the static graph of any route entry — they live in their own chunk.
 *
 * Deletion plan: see comment in `LegacyPromptOverlaysControllerImpl.tsx`.
 * When the prompt subsystem is removed in agents migration phases 16-19,
 * delete BOTH this shell AND the Impl, along with the mounts in
 * `app/DeferredSingletons.tsx` and `app/(public)/PublicProviders.tsx`.
 */

import dynamic from "next/dynamic";

const LegacyPromptOverlaysControllerImpl = dynamic(
  () => import("./LegacyPromptOverlaysControllerImpl"),
  { ssr: false, loading: () => null },
);

export default function LegacyPromptOverlaysController() {
  return <LegacyPromptOverlaysControllerImpl />;
}
