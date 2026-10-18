"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, CalendarDays, Eye, MessageCircle, ThumbsUp, Users } from "lucide-react";
import { Chip, SearchField, SegmentedControl, Select } from "@ai-matrx/design-system/controls";
import { enumUrlCodec, stringUrlCodec, useUrlState } from "@ai-matrx/kit/url-state";
import { Checkbox } from "@/components/ui/checkbox";
import { InfoHint } from "@/components/official/InfoHint";
import { KpiTile } from "@/components/official/kpi/KpiTile";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { YouTubeResearchActions } from "@/features/marketing/discovery/youtube/YouTubeResearchActions";
import {
  formatYouTubeCount,
  formatYouTubeDate,
  formatYouTubeDuration,
  youTubeEngagementRate,
} from "@/features/marketing/discovery/youtube/formatters";
import { VIDEO_SIGNAL_LABELS, type VideoSignal } from "../../videoRanking";
import { videoReadState, type RankedTopicVideo, type VideoReadState } from "./topicVideoLibrary";

const SORTS = ["best", "views", "newest", "longest", "engagement"] as const;
type Sort = (typeof SORTS)[number];
const STATUS_FILTERS = ["all", "analyzed", "unread"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "best", label: "Best match" },
  { value: "views", label: "Most viewed" },
  { value: "newest", label: "Newest" },
  { value: "longest", label: "Longest" },
  { value: "engagement", label: "Most engaging" },
];

const READ_CHIP: Record<VideoReadState, { label: string; tone: "success" | "info" | "warning" | "destructive" | "neutral" }> = {
  analyzed: { label: "Analyzed", tone: "success" },
  partial: { label: "Partly analyzed", tone: "info" },
  analyzing: { label: "Analyzing", tone: "info" },
  failed: { label: "Analysis failed", tone: "destructive" },
  found: { label: "Found", tone: "neutral" },
};

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
  return hours >= 10 ? `${Math.round(hours)} h` : `${hours.toFixed(1)} h`;
}

export function TopicYouTubeLibrary({
  videos,
  selected,
  onToggle,
}: {
  videos: RankedTopicVideo[];
  selected: ReadonlySet<string>;
  onToggle: (videoId: string) => void;
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
    <section className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile label="Videos found" value={videos.length.toLocaleString()} title="Every YouTube video this topic's searches found." />
        <KpiTile label="Analyzed" value={analyzed.toLocaleString()} tone={analyzed > 0 ? "good" : "neutral"} hint={`${Math.round((analyzed / Math.max(1, videos.length)) * 100)}% of found`} />
        <KpiTile label="Total views" value={formatYouTubeCount(totalViews)} title="Combined YouTube views across every found video." />
        <KpiTile label="Channels" value={channels.toLocaleString()} />
        <KpiTile label="Watch time" value={hoursOf(totalSeconds)} title="Combined length of every found video." />
        <KpiTile label="Top score" value={videos[0] ? String(videos[0].score.score) : null} hint={videos[0]?.video.channel_title ?? undefined} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <SearchField
          value={query}
          onChange={(event) => setQuery(event.target.value, { history: "replace" })}
          placeholder="Search titles, channels, descriptions"
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
          <Select aria-label="Keyword" value={keyword} options={keywordOptions} onValueChange={(next) => setKeyword(next)} className="max-w-72" />
        )}
        <Select aria-label="Sort" value={sort} options={SORT_OPTIONS} onValueChange={(next) => setSort(next)} />
      </div>

      {shown.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No videos match these filters.</p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {shown.map((entry, index) => (
            <VideoLibraryCard
              key={entry.video.youtube_video_id}
              entry={entry}
              eagerImage={index < 3}
              selected={selected.has(entry.video.youtube_video_id)}
              onToggle={() => onToggle(entry.video.youtube_video_id)}
            />
          ))}
        </div>
      )}
    </section>
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

function VideoLibraryCard({
  entry,
  eagerImage,
  selected,
  onToggle,
}: {
  entry: RankedTopicVideo;
  eagerImage: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const { video, importance, score, rank } = entry;
  const [expanded, setExpanded] = useState(false);
  const read = READ_CHIP[videoReadState(video)];
  const engagement = youTubeEngagementRate(video.like_count, video.comment_count, video.view_count);
  const description = video.description?.trim() ?? "";
  const longDescription = description.length > 220 || description.split("\n").length > 4;
  const href = marketingRoutes.youtubeVideo(video.youtube_video_id);
  const bestKeywords = (importance?.perKeyword ?? []).slice(0, 3);

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-xl border bg-card ${selected ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
    >
      <Link href={href} className="group relative block aspect-video w-full overflow-hidden bg-muted">
        {video.thumbnail_url && (
          <Image
            src={video.thumbnail_url}
            alt=""
            fill
            loading={eagerImage ? "eager" : "lazy"}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, (max-width: 1536px) 33vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        )}
        <span className="absolute left-2 top-2 rounded-md bg-black/80 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
          #{rank}
        </span>
        {video.duration_seconds != null && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white">
            {formatYouTubeDuration(video.duration)}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Select ${video.title ?? "video"}`} className="mt-1" />
          <div className="min-w-0 flex-1">
            <p className="truncate type-meta font-medium text-muted-foreground">{video.channel_title ?? "YouTube creator"}</p>
            <Link href={href} className="mt-0.5 block font-semibold leading-snug text-foreground hover:underline">
              {video.title ?? "Untitled video"}
            </Link>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className="text-lg font-semibold leading-none tabular-nums text-foreground">{score.score}</span>
            <span className="inline-flex items-center gap-0.5 type-meta text-muted-foreground">
              score
              <InfoHint text={scoreExplanation(entry)} label="How this score is made" />
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 rounded-lg bg-muted/40 px-2 py-2 text-center">
          <Metric icon={<Eye className="size-3.5" />} value={formatYouTubeCount(video.view_count)} label="views" />
          <Metric icon={<ThumbsUp className="size-3.5" />} value={formatYouTubeCount(video.like_count)} label="likes" />
          <Metric icon={<MessageCircle className="size-3.5" />} value={formatYouTubeCount(video.comment_count)} label="comments" />
          <Metric icon={<Users className="size-3.5" />} value={formatYouTubeCount(video.channel_subscriber_count)} label="subscribers" />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 type-meta text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {formatYouTubeDate(video.published_at)}
          </span>
          {engagement !== null && <span>{engagement.toFixed(1)}% engagement</span>}
          {importance && importance.keywordCount > 0 && (
            <span>
              {importance.keywordCount} {importance.keywordCount === 1 ? "keyword" : "keywords"}
              {importance.bestRank != null ? ` · best #${importance.bestRank}` : ""}
            </span>
          )}
        </div>

        {description && (
          <div className="text-sm leading-relaxed text-muted-foreground">
            <p className={`whitespace-pre-line break-words ${expanded ? "" : "line-clamp-4"}`}>{description}</p>
            {longDescription && (
              <button type="button" onClick={() => setExpanded((open) => !open)} className="mt-1 type-meta font-medium text-foreground hover:underline">
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}

        {bestKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {bestKeywords.map((k) => (
              <Chip key={k.keyword_id} label={k.rank != null ? `#${k.rank} ${k.keyword}` : k.keyword} />
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <Chip label={read.label} tone={read.tone} />
          <Link href={href} className="inline-flex items-center gap-1 type-meta font-medium text-foreground hover:underline">
            <ArrowUpRight className="size-3.5" />
            Open
          </Link>
        </div>
        <YouTubeResearchActions videoId={video.youtube_video_id} initialStatus={video.processing_status} showAnalysis={false} />
      </div>
    </article>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-center gap-1 text-sm font-semibold tabular-nums text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {value}
      </div>
      <div className="type-meta text-muted-foreground">{label}</div>
    </div>
  );
}
