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
  useContainerLinksAdapter,
  type PrimaryEntity,
} from "@ai-matrx/associations/react";
import type { EntityTypeToken } from "@ai-matrx/associations";

// The section heading is "Links"; hide the list's own fixed "Resources" label
// (it would repeat it) and keep the Add / refresh controls right-aligned.
const HIDE_LIST_HEADING =
  "[&>div:first-child]:justify-end [&>div:first-child>h3]:hidden";

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
  const container: PrimaryEntity = {
    type: "research_topic",
    id: topicId,
    orgId: organizationId,
    label: topicName,
    direction: "outgoing",
  };
  const adapter = useContainerLinksAdapter(container, TOPIC_LINK_TOKENS);
  return (
    <section className="space-y-2">
      <h2 className="type-secondary font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
        Links
      </h2>
      <AssociationList
        container={container}
        adapter={adapter}
        tokens={[...TOPIC_LINK_TOKENS]}
        variant="compact"
        className={HIDE_LIST_HEADING}
      />
    </section>
  );
}
