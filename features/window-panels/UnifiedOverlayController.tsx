"use client";

/**
 * UnifiedOverlayController — thin client shell.
 *
 * Statically importable from anywhere. The body
 * (`UnifiedOverlayControllerImpl.tsx`) imports the entire windowRegistry
 * (~860 LOC + 96 dynamic-import wrappers + tray-preview JSX) and is
 * `next/dynamic`-loaded on first client render, so the registry's parse
 * cost lives in a separate shared chunk instead of in the static graph
 * of every route entry that mounts the overlay system.
 *
 * Adding a new window remains a 2-file change (registry entry + the
 * window component) — see `features/window-panels/registry/windowRegistry.ts`.
 */

import dynamic from "next/dynamic";

const UnifiedOverlayControllerImpl = dynamic(
  () => import("./UnifiedOverlayControllerImpl"),
  { ssr: false, loading: () => null },
);

export default function UnifiedOverlayController() {
  return <UnifiedOverlayControllerImpl />;
}
