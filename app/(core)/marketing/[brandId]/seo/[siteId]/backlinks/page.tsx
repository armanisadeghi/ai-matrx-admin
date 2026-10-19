// record-view: none — a sub-view (backlinks) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { BacklinksGate } from "@/features/marketing/components/backlinks/BacklinksGate";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

export default function MarketingSeoBacklinksPage() {
  return (
    <Suspense
      fallback={<LoadingSurface label="Loading backlink intelligence…" />}
    >
      <BacklinksGate />
    </Suspense>
  );
}
