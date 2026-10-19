// record-view: none — a sub-view (competitors) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { BacklinksGate } from "@/features/marketing/components/backlinks/BacklinksGate";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

/** How your link profile stands against the competitors you track. */
export default function MarketingSeoBacklinksCompetitorsPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading competitors…" />}>
      <BacklinksGate view="competitors" />
    </Suspense>
  );
}
