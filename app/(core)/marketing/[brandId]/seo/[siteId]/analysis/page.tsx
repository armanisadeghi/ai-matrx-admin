// record-view: none — a sub-view (analysis) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { SiteAnalysisTable } from "@/features/marketing/components/analysis/SiteAnalysisTable";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

export default function MarketingSeoAnalysisPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading site analysis…" />}>
      <SiteAnalysisTable />
    </Suspense>
  );
}
