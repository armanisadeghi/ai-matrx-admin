"use client";

/**
 * views/outline/TopicHoverCard.tsx — the small well-made popover of vision
 * §2.1: "description, counts, facets, a button to open the full panel".
 *
 * A COMPONENT, not a render function: `TopicTree` calls `renderHover(row)` per
 * row, and hooks cannot run inside that call. So the tree is handed
 * `(row) => <TopicHoverCard …/>` and this component reads its own selectors.
 *
 * Gated by the `outline_hover_popover` knob at the call site, and never
 * opened on a coarse pointer by the tree itself.
 */

import { Peek, type PeekBlock } from "@ai-matrx/design-system";

import { useAppSelector } from "@/lib/redux/hooks";

import {
  selectMapTopic,
  selectMapTopicCounts,
  selectMapTopicFacetsWithInheritance,
  selectMapTopicPath,
} from "../../redux/selectors";
import { topicStatusWords } from "../../ui/TopicStatusMark";

export interface TopicHoverCardProps {
  mapId: string;
  slug: string;
  onOpen: (slug: string) => void;
}

export function TopicHoverCard({ mapId, slug, onOpen }: TopicHoverCardProps) {
  const topic = useAppSelector(selectMapTopic(mapId, slug));
  const counts = useAppSelector(selectMapTopicCounts(mapId, slug));
  const facets = useAppSelector(selectMapTopicFacetsWithInheritance(mapId, slug));
  // The root-first path as names; a crumb outside the loaded tree stays its slug (never a lost level).
  const path = useAppSelector((state) =>
    selectMapTopicPath(mapId, slug)(state)
      .map((crumb) => selectMapTopic(mapId, crumb)(state)?.name ?? crumb)
      .join(" › "),
  );

  if (!topic) return null;

  const status = topic.status ? topicStatusWords(topic.status) : null;
  const body: PeekBlock[] = [
    topic.description
      ? { section: "Description", text: topic.description, markdown: true, clamp: 6 }
      : // read-gate-exempt: an empty field on a topic row that is already loaded (the card returns null without the row), not an empty list
        { fact: "No description yet.", muted: true },
    counts.loaded
      ? {
          section: "Counts",
          items: [
            `${counts.pages} ${counts.pages === 1 ? "page" : "pages"}`,
            `${counts.planned} planned`,
            `${counts.keywords} ${counts.keywords === 1 ? "keyword" : "keywords"}`,
          ],
        }
      : { fact: "Counts were not loaded for this view.", muted: true },
    ...(facets.length > 0
      ? [
          {
            section: "Facets",
            tags: facets.map((facet) =>
              facet.inherited
                ? `${facet.key}: ${facet.valueSlug} (inherited${facet.fromSlug ? ` from ${facet.fromSlug}` : ""})`
                : `${facet.key}: ${facet.valueSlug}`,
            ),
          },
        ]
      : []),
  ];

  return (
    <Peek
      record={{
        kind: "Topic",
        id: slug,
        title: topic.name,
        ...(path ? { subtitle: path } : {}),
        ...(status ? { callout: { title: status.label, text: status.title } } : {}),
        body,
        primary: { label: "Open topic", onSelect: () => onOpen(slug) },
      }}
    />
  );
}
