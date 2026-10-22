// record-view: none — a full-viewport workspace that owns the whole screen; there is no page body to extend
import { Suspense } from "react";

import { ReputationGate } from "@/features/marketing/components/reputation/ReputationGate";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

export default function BrandReputationSitePage() {
  return (
    <Suspense
      fallback={<LoadingSurface label="Loading reputation intelligence…" />}
    >
      <ReputationGate />
    </Suspense>
  );
}
