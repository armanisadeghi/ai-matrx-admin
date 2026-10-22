// record-view: none — a sub-view (knowledge) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { BrandIdentitySiteSurface } from "@/features/marketing/components/brand/BrandIdentitySiteSurface";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";
import { KnowledgeRoomSurface } from "@/features/marketing/seo/value-system/discovery/KnowledgeRoomSurface";
import { DiscoveryPage } from "@/features/marketing/seo/value-system/discovery/DiscoveryPage";

/**
 * Brand Knowledge — the Business Discovery Ladder. AI reads the brand's
 * website cold and proposes its business model, customers, money map, and
 * offerings; the human rules each rung. Register item KI-040.
 *
 * Site-scoped underneath: `?site=` picks which of the brand's websites is read
 * (first one by default).
 */
export default function BrandKnowledgePage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading business discovery…" />}>
      <BrandIdentitySiteSurface>
        <KnowledgeRoomSurface>
          <DiscoveryPage />
        </KnowledgeRoomSurface>
      </BrandIdentitySiteSurface>
    </Suspense>
  );
}
