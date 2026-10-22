// record-view: none — a sub-view (insights) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { BacklinksGate } from "@/features/marketing/components/backlinks/BacklinksGate";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

/** What the link data is telling you to do next. */
export default function MarketingSeoBacklinksInsightsPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading insights…" />}>
      <BacklinksGate view="insights" />
    </Suspense>
  );
}
