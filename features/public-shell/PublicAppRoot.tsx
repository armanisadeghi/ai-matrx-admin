"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { startTransition, useCallback, useMemo, useState, type ReactNode } from "react";
import { SignedInHintContext } from "@/lib/scoped-config/signedInHint";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PublicTierContext, isLightPublicPath, type PublicTier } from "./publicTier";

// THE one edge to the full app tree. ssr stays on and there is no `loading`, so next/dynamic adds no
// Suspense boundary: a server render that chose FULL streams it with its chunks preloaded, and an
// in-place switch (inside startTransition) keeps the light page on screen until the chunk is in.
const PublicFullProviders = dynamic(() => import("./PublicFullProvidersImpl"));

/**
 * The (public) layout's client root. Light for a signed-out visitor on a light page; the full app
 * tree for everyone else. See publicTier.ts.
 */
export function PublicAppRoot({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [requested, setRequested] = useState<{ openCanvas: boolean } | null>(null);
  const [wasFull, setWasFull] = useState(false);
  const full = signedIn || wasFull || requested !== null || !isLightPublicPath(pathname);
  if (full && !wasFull) setWasFull(true);

  const requestFull = useCallback((options?: { openCanvas?: boolean }) => {
    startTransition(() => setRequested((prev) => ({ openCanvas: Boolean(prev?.openCanvas || options?.openCanvas) })));
  }, []);
  const lightTier = useMemo<PublicTier>(() => ({ full: false, requestFull, FullIslands: null }), [requestFull]);

  if (full) {
    return <PublicFullProviders openCanvas={requested?.openCanvas ?? false}>{children}</PublicFullProviders>;
  }
  return (
    <SignedInHintContext.Provider value={false}>
      <PublicTierContext.Provider value={lightTier}>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </PublicTierContext.Provider>
    </SignedInHintContext.Provider>
  );
}
