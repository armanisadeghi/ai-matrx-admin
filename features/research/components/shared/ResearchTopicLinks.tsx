"use client";

/**
 * ResearchTopicLinks — what this research is about or feeds, as canonical
 * `platform.associations` edges written FROM the topic (the topic is the edge
 * source). The plop-in association list from `@ai-matrx/associations/react`
 * reads and writes them; nothing here is a second picker.
 *
 * Brands come first: research covers a topic a brand cares about, or becomes
 * that brand's report / topical map. The brand page lists the same edge from
 * its side (Relationships → Research), and Media → Research filters images by
 * it. Registered pairs (platform.association_types): research_topic →
 * web_brand, project, web_site, rulebook. web_page / plan_node are linked from
 * the page side (not reference-pickable) and listed by ResearchUsedBy.
 */

import {
  AssociationList,
  PrimaryEntityProvider,
} from "@ai-matrx/associations/react";
import type { EntityTypeToken } from "@ai-matrx/associations";

const TOPIC_LINK_TOKENS = [
  "web_brand",
  "project",
  "web_site",
  "rulebook",
] as const satisfies readonly EntityTypeToken[];

export function ResearchTopicLinks({
  topicId,
  organizationId,
  topicName,
}: {
  topicId: string;
  organizationId: string;
  topicName: string;
}) {
  return (
    <section className="space-y-1.5">
      <h3 className="type-secondary font-semibold text-foreground">Links</h3>
      <PrimaryEntityProvider
        value={{
          type: "research_topic",
          id: topicId,
          orgId: organizationId,
          label: topicName,
          direction: "outgoing",
        }}
      >
        <AssociationList tokens={[...TOPIC_LINK_TOKENS]} variant="compact" />
      </PrimaryEntityProvider>
    </section>
  );
}
