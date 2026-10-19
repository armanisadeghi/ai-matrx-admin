// record-view: none — a sub-view (changes) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { BacklinksGate } from "@/features/marketing/components/backlinks/BacklinksGate";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

/** What happened to the links you already had — gained, lost, changed. */
export default function MarketingSeoBacklinksChangesPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading link changes…" />}>
      <BacklinksGate view="changes" />
    </Suspense>
  );
}
