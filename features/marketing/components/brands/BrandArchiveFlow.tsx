"use client";

/**
 * BrandArchiveFlow — lazy door to the brand archive flow (the real code is in
 * BrandArchiveFlowImpl.tsx).
 *
 * WHY: the flow statically imports `WindowPanel`, and the brand page / brands list import this
 * file, so a static import here put WindowPanel in the route's boot graph and tripped
 * "[WINDOW-PANELS BUNDLE LEAK]" (features/window-panels/FEATURE.md "Bundle invariant").
 * The implementation now loads on the first archive request (`brand` non-null) and stays
 * mounted afterwards so the shared-items window can finish.
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import type { BrandArchiveFlowProps } from "@/features/marketing/components/brands/BrandArchiveFlowImpl";

export type { BrandArchiveFlowProps };

const Impl = dynamic(
  () =>
    import("@/features/marketing/components/brands/BrandArchiveFlowImpl").then(
      (m) => m.BrandArchiveFlow,
    ),
  { ssr: false },
);

export function BrandArchiveFlow(props: BrandArchiveFlowProps) {
  const [requested, setRequested] = useState(false);
  if (props.brand && !requested) setRequested(true);
  return requested ? <Impl {...props} /> : null;
}
