// record-view: none — a sub-view (growth-loop) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";
import { SiteGrowthLoopWorkspace } from "@/features/growth-loop/run/components/SiteGrowthLoopWorkspace";

export default function MarketingSeoGrowthLoopPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading the growth loop…" />}>
      <SiteGrowthLoopWorkspace />
    </Suspense>
  );
}
