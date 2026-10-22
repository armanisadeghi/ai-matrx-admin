"use client";

// The topic's headline numbers — what the research system found and did, each
// figure opening the tab that holds it. Same stage as the topic video library
// (flagship surface, Arman 2026-10-17): display figures, quiet labels, no boxes.

import { formatCount } from "@ai-matrx/kit/format";
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
  // A failed count says so; a count still loading shows the dash.
  const videoValue = (count: number | undefined) =>
    videos.error ? "Unavailable" : count == null ? "—" : formatCount(count);

  const figures: { label: string; value: string; of?: string; href: string }[] = [
    { label: "Sources found", value: formatCount(progress.total_sources), href: hrefFor("sources", topicId) },
    { label: "Captured", value: formatCount(progress.total_content), href: hrefFor("content", topicId) },
    // No "of N": N is every page and video captured, not a goal, so "29 of 38"
    // read as unfinished on a topic whose report is ready.
    {
      label: "Analyzed",
      value: progress.total_analyses.toLocaleString(),
      href: hrefFor("analysis", topicId),
    },
    {
      label: "Videos found",
      value: videoValue(videos.data?.found),
      href: hrefFor("youtube", topicId),
    },
    {
      label: "Video transcripts",
      value: videoValue(videos.data?.transcribed),
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
        <div key={figure.label} className="flex flex-col gap-1">
          <dt className="type-label">
            <Link href={figure.href} className="hover:text-foreground hover:underline">
              {figure.label}
            </Link>
          </dt>
          <dd className="flex items-baseline gap-1.5">
            <Link href={figure.href} className="flex items-baseline gap-1.5" tabIndex={-1} aria-hidden>
              {/* ui-exception: flagship stage — headline figures. */}
              <span className="text-3xl font-semibold tabular-nums text-foreground">{figure.value}</span>
              {figure.of && <span className="type-secondary text-muted-foreground">{figure.of}</span>}
            </Link>
          </dd>
        </div>
      ))}
    </dl>
  );
}
