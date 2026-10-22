// record-view: none — a sub-view (ai-visibility) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";
import { SiteAiVisibilityWorkspace } from "@/features/marketing/seo/ai-visibility/SiteAiVisibilityWorkspace";

export default function MarketingSeoAiVisibilityPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading AI visibility…" />}>
      <SiteAiVisibilityWorkspace />
    </Suspense>
  );
}
