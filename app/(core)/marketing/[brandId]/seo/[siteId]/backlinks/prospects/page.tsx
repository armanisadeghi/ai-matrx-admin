// record-view: none — a sub-view (prospects) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { BacklinksGate } from "@/features/marketing/components/backlinks/BacklinksGate";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

/** Sites that link to your competitors and not yet to you. */
export default function MarketingSeoBacklinksProspectsPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading prospects…" />}>
      <BacklinksGate view="prospects" />
    </Suspense>
  );
}
