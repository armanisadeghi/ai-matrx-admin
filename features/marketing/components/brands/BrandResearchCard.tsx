"use client";

/**
 * BrandResearchCard — the research topics linked to this brand, read and
 * written as the canonical `research_topic → web_brand` edge in
 * `platform.associations` through the plop-in association list. The research
 * topic's own Settings → Links shows the same edge from its side, and
 * Media → Research filters images by it.
 */

import {
  AssociationList,
  PrimaryEntityProvider,
} from "@ai-matrx/associations/react";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";

export function BrandResearchCard({
  brandId,
  brandName,
  organizationId,
}: {
  brandId: string;
  brandName: string;
  organizationId: string;
}) {
  return (
    <SectionCard
      title="Research"
      anchor="brand-research"
      about="Research topics about this brand or what it covers. Linked research narrows Media → Research to its images."
    >
      <div className="p-3">
        <PrimaryEntityProvider
          value={{
            type: "web_brand",
            id: brandId,
            orgId: organizationId,
            label: brandName,
          }}
        >
          <AssociationList tokens={["research_topic"]} variant="compact" />
        </PrimaryEntityProvider>
      </div>
    </SectionCard>
  );
}
