// record-view: none — a sub-view (performance) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";
import { SiteKeywordsView } from "@/features/marketing/seo/keyword-research/components/SiteKeywordsView";

/** What people searched, what they clicked, where you rank. */
export default function MarketingSeoKeywordPerformancePage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading keyword performance…" />}>
      <SiteKeywordsView view="performance" />
    </Suspense>
  );
}
