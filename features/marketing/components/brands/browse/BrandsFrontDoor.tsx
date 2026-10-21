"use client";

// The Brands front door's surface mount: the guest landing declares `matrx-user/marketing` like every
// other Brands page (feature-pages contract, rule 5).
import type { ReactNode } from "react";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { createMarketingScope } from "@/features/surfaces/manifests/marketing.manifest";

export function BrandsFrontDoor({ children }: { children: ReactNode }) {
  return (
    <SurfaceRuntimeProvider surfaceName="matrx-user/marketing" getScope={() => createMarketingScope({ hub_view: "brands" })}>
      {children}
    </SurfaceRuntimeProvider>
  );
}
