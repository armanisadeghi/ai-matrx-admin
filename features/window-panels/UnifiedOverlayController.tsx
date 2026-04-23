"use client";

/**
 * UnifiedOverlayController — registry-driven replacement for the legacy
 * 2,586-line hand-written OverlayController.
 *
 * Iterates `ALL_WINDOW_REGISTRY_ENTRIES` and renders one <OverlaySurface>
 * per entry. Each surface manages its own Redux subscription + lazy import,
 * so this controller itself has zero direct window imports — adding a new
 * window is a 2-file change (registry entry + the window component).
 *
 * Bundle invariant: this file imports only React, the registry (pure data),
 * and OverlaySurface. No window component statically imported anywhere.
 *
 * Rollout: wired behind `NEXT_PUBLIC_OVERLAYS_V2=1` at the mount points
 * (`app/DeferredSingletons.tsx`, `app/(public)/PublicProviders.tsx`). When
 * the flag is off, the legacy OverlayController stays authoritative. In
 * sub-phase 2b we absorb the remaining non-window overlays, smoke-test,
 * default the flag on, and delete the legacy controller.
 */
import { useEffect, useState } from "react";
import {
  ALL_WINDOW_REGISTRY_ENTRIES,
  assertRegistryIntegrity,
} from "@/features/window-panels/registry/windowRegistry";
import { OverlaySurface } from "./OverlaySurface";

let _integrityChecked = false;

export default function UnifiedOverlayController() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (process.env.NODE_ENV !== "production" && !_integrityChecked) {
      _integrityChecked = true;
      try {
        assertRegistryIntegrity();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[UnifiedOverlayController] registry integrity:", err);
      }
    }
  }, []);

  // Portals + lazy components need a client-side mount — matches the
  // legacy controller's `isMounted` gate so rendering behavior lines up.
  if (!mounted) return null;

  return (
    <>
      {ALL_WINDOW_REGISTRY_ENTRIES.map((entry) => (
        <OverlaySurface key={entry.overlayId} overlayId={entry.overlayId} />
      ))}
    </>
  );
}
