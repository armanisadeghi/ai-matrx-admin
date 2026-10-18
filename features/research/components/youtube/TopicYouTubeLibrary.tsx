"use client";

// The topic's video library — the research system's showcase of every video it
// found. A flagship surface (Arman, 2026-10-17): bespoke type sizes inside this
// feature are deliberate, colours stay on tokens. Champion: YouTube's own
// search results — thumbnail left, title, one quiet meta line, channel, a short
// description, nothing boxed.

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Brain, Check, LoaderCircle } from "lucide-react";
import { Button, SearchField, SegmentedControl, Select } from "@ai-matrx/design-system/controls";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { enumUrlCodec, stringUrlCodec, useUrlState } from "@ai-matrx/kit/url-state";
import { Checkbox } from "@/components/ui/checkbox";
import { InfoHint } from "@/components/official/InfoHint";
import { UserAvatarDisplay } from "@/components/user/UserIdentity";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import {
  formatYouTubeCount,
  formatYouTubeDuration,
  youTubeEngagementRate,
} from "@/features/marketing/discovery/youtube/formatters";
import { cn } from "@/lib/utils";
import { VIDEO_SIGNAL_LABELS, type VideoSignal } from "../../videoRanking";
import { videoReadState, type RankedTopicVideo } from "./topicVideoLibrary";

const SORTS = ["best", "views", "newest", "longest", "engagement"] as const;
type Sort = (typeof SORTS)[number];
const STATUS_FILTERS = ["all", "analyzed", "unread"] as const;

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "best", label: "Best match" },
  { value: "views", label: "Most viewed" },
  { value: "newest", label: "Newest" },
  { value: "longest", label: "Longest" },
  { value: "engagement", label: "Most engaging" },
];

function engagementOf({ video }: RankedTopicVideo): number {
  return youTubeEngagementRate(video.like_count, video.comment_count, video.view_count) ?? -1;
}

function sortVideos(videos: RankedTopicVideo[], sort: Sort): RankedTopicVideo[] {
  const list = [...videos];
  switch (sort) {
    case "views":
      return list.sort((a, b) => (b.video.view_count ?? -1) - (a.video.view_count ?? -1));
    case "newest":
      return list.sort((a, b) => (b.video.published_at ?? "").localeCompare(a.video.published_at ?? ""));
    case "longest":
      return list.sort((a, b) => (b.video.duration_seconds ?? -1) - (a.video.duration_seconds ?? -1));
    case "engagement":
      return list.sort((a, b) => engagementOf(b) - engagementOf(a));
    default:
      return list.sort((a, b) => a.rank - b.rank);
  }
}

function hoursOf(totalSeconds: number): string {
  const hours = totalSeconds / 3600;
  return hours >= 10 ? `${Math.round(hours)}h` : `${hours.toFixed(1)}h`;
}

export function TopicYouTubeLibrary({
  videos,
  selected,
  onToggle,
  analyzing,
  onAnalyze,
}: {
  videos: RankedTopicVideo[];
  selected: ReadonlySet<string>;
  onToggle: (videoId: string) => void;
  /** Videos whose analysis is running now. */
  analyzing: ReadonlySet<string>;
  onAnalyze: (videoId: string) => void;
}) {
  const [sort, setSort] = useUrlState("sort", enumUrlCodec(SORTS, "best"));
  const [status, setStatus] = useUrlState("status", enumUrlCodec(STATUS_FILTERS, "all"));
  const [keyword, setKeyword] = useUrlState("keyword", stringUrlCodec(""));
  const [query, setQuery] = useUrlState("q", stringUrlCodec(""));

  const analyzed = videos.filter((v) => videoReadState(v.video) === "analyzed").length;
  const totalViews = videos.reduce((sum, v) => sum + (v.video.view_count ?? 0), 0);
  const channels = new Set(videos.map((v) => v.video.channel_id ?? v.video.channel_title)).size;
  const totalSeconds = videos.reduce((sum, v) => sum + (v.video.duration_seconds ?? 0), 0);

  const keywordNames = new Map<string, string>();
  for (const v of videos) {
    for (const k of v.importance?.perKeyword ?? []) keywordNames.set(k.keyword_id, k.keyword);
  }
  const keywordOptions = [
    { value: "", label: "All keywords" },
    ...[...keywordNames].map(([value, label]) => ({ value, label })),
  ];

  const needle = query.trim().toLowerCase();
  const shown = sortVideos(
    videos.filter((v) => {
      const state = videoReadState(v.video);
      if (status === "analyzed" && state !== "analyzed") return false;
      if (status === "unread" && state === "analyzed") return false;
      if (keyword && !v.importance?.perKeyword.some((k) => k.keyword_id === keyword)) return false;
      if (!needle) return true;
      return [v.video.title, v.video.channel_title, v.video.description].some((text) =>
        text?.toLowerCase().includes(needle),
      );
    }),
    sort,
  );

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-8 sm:px-8">
      <header className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        {/* ui-exception: flagship stage — display number for the headline count. */}
        <p className="text-5xl font-semibold tracking-tight tabular-nums text-foreground">
          {videos.length.toLocaleString()}
          <span className="ml-3 text-2xl font-medium tracking-normal text-muted-foreground">videos found</span>
        </p>
        <dl className="grid grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4">
          <HeadlineStat label="Analyzed" value={`${analyzed}`} />
          <HeadlineStat label="Total views" value={formatYouTubeCount(totalViews)} />
          <HeadlineStat label="Channels" value={channels.toLocaleString()} />
          <HeadlineStat label="Watch time" value={hoursOf(totalSeconds)} />
        </dl>
      </header>

      <div className="flex flex-wrap items-center gap-2 py-5">
        <SearchField
          value={query}
          onChange={(event) => setQuery(event.target.value, { history: "replace" })}
          placeholder="Search videos"
          aria-label="Search videos"
          className="min-w-56 flex-1"
        />
        <SegmentedControl
          aria-label="Analysis status"
          value={status}
          onValueChange={(next) => setStatus(next)}
          data={[
            { value: "all", label: "All", count: videos.length },
            { value: "analyzed", label: "Analyzed", count: analyzed },
            { value: "unread", label: "Not analyzed", count: videos.length - analyzed },
          ]}
        />
        {keywordOptions.length > 2 && (
          <Select aria-label="Keyword" value={keyword} options={keywordOptions} onValueChange={(next) => setKeyword(next)} className="max-w-64" />
        )}
        <Select aria-label="Sort" value={sort} options={SORT_OPTIONS} onValueChange={(next) => setSort(next)} />
      </div>

      {/* read-gate-exempt: filters over videos already loaded; the parent page owns the read and its failure */}
      {shown.length === 0 ? (
        <p className="py-16 text-center type-body text-muted-foreground">No videos match these filters.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {shown.map((entry, index) => (
            <VideoRow
              key={entry.video.youtube_video_id}
              entry={entry}
              eagerImage={index < 4}
              selected={selected.has(entry.video.youtube_video_id)}
              selecting={selected.size > 0}
              onToggle={() => onToggle(entry.video.youtube_video_id)}
              analyzing={analyzing.has(entry.video.youtube_video_id)}
              onAnalyze={() => onAnalyze(entry.video.youtube_video_id)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function HeadlineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="type-label">{label}</dt>
      {/* ui-exception: flagship stage — headline figures. */}
      <dd className="text-2xl font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function scoreExplanation(entry: RankedTopicVideo): string {
  return (Object.keys(VIDEO_SIGNAL_LABELS) as VideoSignal[])
    .map((key) => {
      const value = entry.score.signals[key];
      return `${VIDEO_SIGNAL_LABELS[key]} ${value == null ? "—" : Math.round(value * 100)}`;
    })
    .join(" · ");
}

function VideoRow({
  entry,
  eagerImage,
  selected,
  selecting,
  onToggle,
  analyzing,
  onAnalyze,
}: {
  entry: RankedTopicVideo;
  eagerImage: boolean;
  selected: boolean;
  selecting: boolean;
  onToggle: () => void;
  analyzing: boolean;
  onAnalyze: () => void;
}) {
  const { video, importance, score, rank } = entry;
  const [expanded, setExpanded] = useState(false);
  // maxresdefault does not exist for every video; hqdefault always does, and
  // object-cover in a 16:9 frame crops its letterbox bars away.
  const fallbackThumbnail = `https://i.ytimg.com/vi/${video.youtube_video_id}/hqdefault.jpg`;
  const [thumbnail, setThumbnail] = useState(video.thumbnail_url ?? fallbackThumbnail);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const analyzed = videoReadState(video) === "analyzed";
  const engagement = youTubeEngagementRate(video.like_count, video.comment_count, video.view_count);
  const description = video.description?.trim() ?? "";
  const longDescription = description.length > 180 || description.split("\n").length > 2;
  const href = marketingRoutes.youtubeVideo(video.youtube_video_id);
  const topKeyword = importance?.perKeyword[0] ?? null;
  const otherKeywords = Math.max(0, (importance?.keywordCount ?? 0) - 1);

  const meta = [
    video.view_count != null ? `${formatYouTubeCount(video.view_count)} views` : null,
    video.like_count != null ? `${formatYouTubeCount(video.like_count)} likes` : null,
    video.comment_count != null ? `${formatYouTubeCount(video.comment_count)} comments` : null,
<<<<<<< origin/main
    video.published_at ? formatRelativeTime(video.published_at, { style: "intl" }) : null,
=======
    video.published_at ? formatRelativeTime(video.published_at, { style: "long" }) : null,
>>>>>>> HEAD
  ].filter(Boolean);

  return (
    <li
      className={cn(
        "group relative grid gap-5 rounded-2xl p-3 transition-colors sm:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_auto]",
        selected ? "bg-accent" : "hover:bg-accent/50",
      )}
    >
      <div className="relative">
        <Link href={href} className="relative block aspect-video overflow-hidden rounded-xl bg-muted">
          {!thumbnailLoaded && <span aria-hidden className="absolute inset-0 animate-pulse bg-muted" />}
          <Image
            src={thumbnail}
            alt=""
            fill
            unoptimized
            loading={eagerImage ? "eager" : "lazy"}
            className="object-cover"
            onError={() => setThumbnail(fallbackThumbnail)}
            // A missing size comes back as YouTube's 120px grey placeholder, not an error.
            onLoad={(event) => {
              if (event.currentTarget.naturalWidth <= 120 && thumbnail !== fallbackThumbnail) {
                setThumbnail(fallbackThumbnail);
                return;
              }
              setThumbnailLoaded(true);
            }}
          />
          {video.duration && (
            // ui-exception: ink on a photo is fixed white on a dark scrim (YouTube's own convention).
            <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 type-meta font-medium tabular-nums text-white">
              {formatYouTubeDuration(video.duration)}
            </span>
          )}
        </Link>
        <div
          className={cn(
            "absolute left-2 top-2 rounded-md bg-card p-1 shadow-sm transition-opacity",
            selected || selecting ? "opacity-100" : "opacity-0 focus-within:opacity-100 group-hover:opacity-100",
          )}
        >
          <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Select ${video.title ?? "video"}`} />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2 py-1">
        {/* ui-exception: flagship stage — a video title reads at YouTube's own size. */}
        <Link href={href} className="text-lg font-semibold leading-snug text-foreground hover:underline">
          {video.title ?? "Untitled video"}
        </Link>
        <p className="type-secondary tabular-nums text-muted-foreground">
          {meta.join(" · ")}
          {engagement !== null && engagement > 0 && ` · ${engagement.toFixed(1)}% engagement`}
        </p>
        <div className="flex items-center gap-2">
          <UserAvatarDisplay user={{ id: video.channel_id, name: video.channel_title }} size="xs" />
          <span className="truncate type-title text-foreground">{video.channel_title ?? "YouTube creator"}</span>
          {video.channel_subscriber_count != null && (
            <span className="shrink-0 type-secondary text-muted-foreground">
              {formatYouTubeCount(video.channel_subscriber_count)} subscribers
            </span>
          )}
        </div>
        {description && (
<<<<<<< origin/main
          <p className={cn("whitespace-pre-line break-words type-body text-muted-foreground", !expanded && "line-clamp-2")}>
            {description}
          </p>
        )}
        {(topKeyword || longDescription) && (
          <div className="flex min-h-7 items-center justify-between gap-3">
            {topKeyword ? (
              <p className="min-w-0 truncate type-secondary text-muted-foreground">
                {topKeyword.rank != null ? `#${topKeyword.rank} for ` : "Found for "}
                <span className="text-foreground">“{topKeyword.keyword}”</span>
                {otherKeywords > 0 && ` and ${otherKeywords} more`}
              </p>
            ) : (
              <span />
            )}
=======
          <div className="type-body text-muted-foreground">
            <p className={cn("whitespace-pre-line break-words", !expanded && "line-clamp-2")}>{description}</p>
>>>>>>> HEAD
            {longDescription && (
              <Button type="button" variant="link" onClick={() => setExpanded((open) => !open)}>
                {expanded ? "Less" : "More"}
              </Button>
            )}
          </div>
        )}
<<<<<<< origin/main
=======
        {topKeyword && (
          <p className="truncate type-secondary text-muted-foreground">
            {topKeyword.rank != null ? `#${topKeyword.rank} for ` : "Found for "}
            <span className="text-foreground">“{topKeyword.keyword}”</span>
            {otherKeywords > 0 && ` and ${otherKeywords} more`}
          </p>
        )}
>>>>>>> HEAD
      </div>

      <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start sm:py-1">
        <ScoreRing score={score.score} rank={rank} explanation={scoreExplanation(entry)} />
        <div className="flex items-center gap-1 sm:flex-col sm:items-end">
          {analyzed ? (
            <span className="inline-flex items-center gap-1 type-secondary font-medium text-success-ink">
              <Check className="size-3.5" />
              Analyzed
            </span>
          ) : (
            <Button
              type="button"
              variant="outline"
              icon={analyzing ? <LoaderCircle className="animate-spin" /> : <Brain />}
              disabled={analyzing}
              onClick={onAnalyze}
            >
              {analyzing ? "Analyzing" : "Analyze"}
            </Button>
          )}
          <Button asChild variant="quiet" icon={<ArrowUpRight />}>
            <Link href={href}>Open</Link>
          </Button>
        </div>
      </div>
    </li>
  );
}

const RING_RADIUS = 20;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function ScoreRing({ score, rank, explanation }: { score: number; rank: number; explanation: string }) {
  return (
    <div className="flex items-center gap-2 sm:flex-col sm:gap-1">
      <div className="relative size-12">
        <svg viewBox="0 0 48 48" className="size-12 -rotate-90" aria-hidden>
          <circle cx="24" cy="24" r={RING_RADIUS} fill="none" strokeWidth="4" className="stroke-muted" />
          <circle
            cx="24"
            cy="24"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            className="stroke-primary"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - score / 100)}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center type-title tabular-nums text-foreground">{score}</span>
      </div>
      <span className="inline-flex items-center gap-0.5 type-meta text-muted-foreground">
        #{rank}
        <InfoHint text={explanation} label="How this score is made" />
      </span>
    </div>
  );
}
