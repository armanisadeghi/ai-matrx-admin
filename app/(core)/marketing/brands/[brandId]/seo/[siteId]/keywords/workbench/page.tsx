// record-view: none — a sub-view (workbench) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";
import { SiteKeywordsView } from "@/features/marketing/seo/keyword-research/components/SiteKeywordsView";

/**
 * THE assignment surface: say what a keyword IS — set its class or any
 * dimension, with the reason that teaches the system.
 */
export default function MarketingSeoKeywordWorkbenchPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading keyword workbench…" />}>
      <SiteKeywordsView view="workbench" />
    </Suspense>
  );
}
