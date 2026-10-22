// record-view: none — a sub-view (run) inside a record or scope, not the record page; the record's own page carries the section
// app/(core)/marketing/brands/[brandId]/intelligence/competitors/run/page.tsx
//
// The SEO autopsy "Run" screen. The bare `…/competitors` route is the brand's
// competitor list (All); Run is one of the autopsy modes beside it.

import { Suspense } from "react";

import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";
import { BrandScopedCompetitors } from "@/features/marketing/competitors/BrandScopedCompetitors";

export default function BrandCompetitorRunPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading competitors…" />}>
      <BrandScopedCompetitors view="run" />
    </Suspense>
  );
}
