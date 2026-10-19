import { Suspense } from "react";

import { BrandIdentitySiteSurface } from "@/features/marketing/components/brand/BrandIdentitySiteSurface";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";
import { GuidelinesRoomSurface } from "@/features/marketing/seo/value-system/guidelines/GuidelinesRoomSurface";
import { GuidelinesWorkbench } from "@/features/marketing/seo/value-system/guidelines/GuidelinesWorkbench";

/** How this brand must be written about — the rules every agent inherits. */
export default function BrandGuidelinesPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading business guidelines…" />}>
      <BrandIdentitySiteSurface>
        <GuidelinesRoomSurface>
          <GuidelinesWorkbench />
        </GuidelinesRoomSurface>
      </BrandIdentitySiteSurface>
    </Suspense>
  );
}
