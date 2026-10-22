// record-view: none — a sub-view (pages) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { BacklinksGate } from "@/features/marketing/components/backlinks/BacklinksGate";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

/** Which of your pages earned the links. */
export default function MarketingSeoBacklinksPagesPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading top linked pages…" />}>
      <BacklinksGate view="pages" />
    </Suspense>
  );
}
