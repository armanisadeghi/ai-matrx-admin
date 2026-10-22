// record-view: none — a sub-view (rankings) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { RanksWorkspace } from "@/features/marketing/components/ranks/RanksWorkspace";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

/** Keyword positions and movement for this site (was `…/sites/[siteId]/ranks`). */
export default function MarketingSeoRankingsPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading rank portfolio…" />}>
      <RanksWorkspace />
    </Suspense>
  );
}
