"use client";

// The topic's headline numbers — what the research system found and did, each
// figure opening the tab that holds it. Same stage as the topic video library
// (flagship surface, Arman 2026-10-17): display figures, quiet labels, no boxes.

import Link from "next/link";
import { useTopicContext } from "../../context/ResearchContext";
import { useTopicVideoCounts } from "../../hooks/useResearchState";
import { RESEARCH_NAV_ITEMS } from "../../constants";

function hrefFor(key: string, topicId: string): string {
  const item = RESEARCH_NAV_ITEMS.find((nav) => nav.key === key);
  return item ? item.href(topicId) : `/research/topics/${topicId}`;
}

export function TopicHeadline() {
  const { topicId, progress } = useTopicContext();
  const videos = useTopicVideoCounts(topicId);
  if (!progress) return null;

  const figures: { label: string; value: string; of?: string; href: string }[] = [
    { label: "Sources found", value: progress.total_sources.toLocaleString(), href: hrefFor("sources", topicId) },
    { label: "Pages read", value: progress.total_content.toLocaleString(), href: hrefFor("content", topicId) },
    {
      label: "Analyzed",
      value: progress.total_analyses.toLocaleString(),
      of: progress.total_eligible_for_analysis > 0 ? `of ${progress.total_eligible_for_analysis}` : undefined,
      href: hrefFor("analysis", topicId),
    },
    {
      label: "Videos found",
      value: videos.data ? videos.data.found.toLocaleString() : "—",
      href: hrefFor("youtube", topicId),
    },
    {
      label: "Video transcripts",
      value: videos.data ? videos.data.transcribed.toLocaleString() : "—",
      href: hrefFor("youtube", topicId),
    },
    {
      label: "Keywords",
      value: progress.total_keywords.toLocaleString(),
      href: hrefFor("keywords", topicId),
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-5 px-4 pb-2 pt-6 sm:grid-cols-3 lg:grid-cols-6">
      {figures.map((figure) => (
        <Link key={figure.label} href={figure.href} className="group flex flex-col gap-1">
          <dt className="type-label group-hover:text-foreground">{figure.label}</dt>
          <dd className="flex items-baseline gap-1.5">
            {/* ui-exception: flagship stage — headline figures. */}
            <span className="text-3xl font-semibold tabular-nums text-foreground">{figure.value}</span>
            {figure.of && <span className="type-secondary text-muted-foreground">{figure.of}</span>}
          </dd>
        </Link>
      ))}
    </dl>
  );
}
