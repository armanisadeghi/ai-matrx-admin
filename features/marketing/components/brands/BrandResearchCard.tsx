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
  useContainerLinksAdapter,
  type PrimaryEntity,
} from "@ai-matrx/associations/react";
import type { EntityTypeToken } from "@ai-matrx/associations";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";

// The card title is the heading; the list's own fixed "Resources" label would
// repeat it, so hide it and keep the Add / refresh controls right-aligned.
const HIDE_LIST_HEADING =
  "[&>div:first-child]:justify-end [&>div:first-child>h3]:hidden";

const RESEARCH_TOKENS: readonly EntityTypeToken[] = ["research_topic"];

export function BrandResearchCard({
  brandId,
  brandName,
  organizationId,
}: {
  brandId: string;
  brandName: string;
  organizationId: string;
}) {
  const container: PrimaryEntity = {
    type: "web_brand",
    id: brandId,
    orgId: organizationId,
    label: brandName,
  };
  const adapter = useContainerLinksAdapter(container, RESEARCH_TOKENS);
  return (
    <SectionCard
      title="Research"
      anchor="brand-research"
      about="Research topics about this brand or what it covers. Linked research narrows Media → Research to its images."
    >
      <div className="p-3">
        <AssociationList
          container={container}
          adapter={adapter}
          tokens={[...RESEARCH_TOKENS]}
          variant="compact"
          className={HIDE_LIST_HEADING}
        />
      </div>
    </SectionCard>
  );
}
