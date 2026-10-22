// record-view: none — a sub-view (coverage) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { CoverageWorkspace } from "@/features/marketing/components/coverage/CoverageWorkspace";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

export default function MarketingSeoCoveragePage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading coverage…" />}>
      <CoverageWorkspace />
    </Suspense>
  );
}
