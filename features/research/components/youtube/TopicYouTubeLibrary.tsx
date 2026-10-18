"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Eye, MessageCircle, ThumbsUp, Users } from "lucide-react";
import { Button, Chip, SearchField, SegmentedControl, Select } from "@ai-matrx/design-system/controls";
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
import { videoReadState, type RankedTopicVideo } from "./topicVideoLibrary";

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

      {/* read-gate-exempt: filters over videos already loaded; the parent page owns the read and its failure */}
      {shown.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No videos match these filters.</p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3 min-[1900px]:grid-cols-4">
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
  // maxresdefault does not exist for every video; hqdefault always does, and
  // object-cover in a 16:9 frame crops its letterbox bars away.
  const fallbackThumbnail = `https://i.ytimg.com/vi/${video.youtube_video_id}/hqdefault.jpg`;
  const [thumbnail, setThumbnail] = useState(video.thumbnail_url ?? fallbackThumbnail);
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
        {thumbnail && (
          <Image
            src={thumbnail}
            onError={() => setThumbnail(fallbackThumbnail)}
            // A missing size comes back as YouTube's 120px grey placeholder, not an error.
            onLoad={(event) => {
              if (event.currentTarget.naturalWidth <= 120 && thumbnail !== fallbackThumbnail) {
                setThumbnail(fallbackThumbnail);
              }
            }}
            // YouTube's CDN already serves sized thumbnails; resizing them again
            // only adds a hop (and hung locally on one sddefault image).
            unoptimized
            alt=""
            fill
            loading={eagerImage ? "eager" : "lazy"}
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        )}
        {/* ui-exception: badges sit on a photo, so ink is fixed white on a dark scrim (YouTube's own convention). */}
        <span className="absolute left-2 top-2 rounded-md bg-black/80 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
          #{rank}
        </span>
        {video.duration && (
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

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-lg bg-muted/40 px-3 py-2">
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
              <Button type="button" variant="quiet" onClick={() => setExpanded((open) => !open)} className="mt-1">
                {expanded ? "Show less" : "Show more"}
              </Button>
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

        <div className="mt-auto" />
        <YouTubeResearchActions videoId={video.youtube_video_id} initialStatus={video.processing_status} showAnalysis={false} />
      </div>
    </article>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
      <span className="truncate type-meta text-muted-foreground">{label}</span>
    </div>
  );
}
