"use client";

// The topic's video library — the research system's showcase of every video it
// found. Champion: YouTube's own home grid (Arman, 2026-10-17): 16:9 thumbnail,
// channel avatar beside a two-line title, channel, "views · age", a ⋮ menu for
// actions, and a Shorts shelf of tall cards. Nothing boxed, no extra text.
// Bespoke type sizes inside this feature are deliberate; colours stay on tokens.

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Brain, CheckCircle2, ExternalLink, LoaderCircle, MoreVertical, PanelTop, SquareCheck } from "lucide-react";
import { Button, SearchField, SegmentedControl, Select } from "@ai-matrx/design-system/controls";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { openOutbound } from "@ai-matrx/kit/outbound";
import { enumUrlCodec, stringUrlCodec, useUrlState } from "@ai-matrx/kit/url-state";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

/** Shorts shown before "Show all" — one shelf row at the widest layout. */
const SHORTS_SHELF = 6;
/** Regular videos shown above the Shorts shelf — two rows of three. */
const VIDEOS_BEFORE_SHORTS = 6;

/**
 * A Short: YouTube's own verdict when we have it (`media_kind`, set from its
 * /shorts/ probe — Shorts run to three minutes); otherwise a /shorts/ address,
 * or a minute or less as the last resort.
 */
export function isShort(entry: RankedTopicVideo): boolean {
  if (entry.mediaKind === "short") return true;
  if (entry.mediaKind === "long") return false;
  const { video } = entry;
  if (video.canonical_url?.includes("/shorts/")) return true;
  return video.duration_seconds != null && video.duration_seconds > 0 && video.duration_seconds <= 60;
}

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

interface TileActions {
  selected: ReadonlySet<string>;
  onToggle: (videoId: string) => void;
  analyzing: ReadonlySet<string>;
  onAnalyze: (videoId: string) => void;
}

export function TopicYouTubeLibrary({
  videos,
  ...actions
}: TileActions & { videos: RankedTopicVideo[] }) {
  const [sort, setSort] = useUrlState("sort", enumUrlCodec(SORTS, "best"));
  const [status, setStatus] = useUrlState("status", enumUrlCodec(STATUS_FILTERS, "all"));
  const [keyword, setKeyword] = useUrlState("keyword", stringUrlCodec(""));
  const [query, setQuery] = useUrlState("q", stringUrlCodec(""));
  const [allShorts, setAllShorts] = useState(false);

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
  const longForm = shown.filter((v) => !isShort(v));
  const shorts = shown.filter(isShort);
  const shelf = allShorts ? shorts : shorts.slice(0, SHORTS_SHELF);

  const stats = [
    `${analyzed} analyzed`,
    `${formatYouTubeCount(totalViews)} views`,
    `${channels} channels`,
    `${hoursOf(totalSeconds)} of video`,
  ].join(" · ");

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-5 sm:px-6">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          {/* ui-exception: flagship stage — the library's headline count. */}
          <h1 className="text-xl font-semibold tabular-nums text-foreground">
            {videos.length.toLocaleString()} videos found
          </h1>
          <p className="type-secondary tabular-nums text-muted-foreground">{stats}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            <Select aria-label="Keyword" value={keyword} options={keywordOptions} onValueChange={(next) => setKeyword(next)} className="max-w-56" />
          )}
          <Select aria-label="Sort" value={sort} options={SORT_OPTIONS} onValueChange={(next) => setSort(next)} />
        </div>
      </div>

      {/* read-gate-exempt: filters over videos already loaded; the parent page owns the read and its failure */}
      {shown.length === 0 ? (
        <p className="py-16 text-center type-body text-muted-foreground">No videos match these filters.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-10">
          {longForm.length > 0 && (
            <VideoGrid entries={longForm.slice(0, VIDEOS_BEFORE_SHORTS)} eager {...actions} />
          )}
          {shorts.length > 0 && (
            <section aria-label="Shorts">
              <div className="mb-3 flex items-center justify-between">
                {/* ui-exception: flagship stage — shelf heading at YouTube's size.
                    read-gate-exempt: counts videos already loaded; the parent page owns the read. */}
                <h2 className="text-lg font-semibold text-foreground">
                  Shorts <span className="type-secondary font-normal text-muted-foreground">{shorts.length}</span>
                </h2>
                {shorts.length > SHORTS_SHELF && (
                  <Button type="button" variant="quiet" onClick={() => setAllShorts((open) => !open)}>
                    {allShorts ? "Show fewer" : `Show all ${shorts.length}`}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {shelf.map((entry) => (
                  <ShortTile key={entry.video.youtube_video_id} entry={entry} {...actions} />
                ))}
              </div>
            </section>
          )}
          {longForm.length > VIDEOS_BEFORE_SHORTS && (
            <VideoGrid entries={longForm.slice(VIDEOS_BEFORE_SHORTS)} eager={false} {...actions} />
          )}
        </div>
      )}
    </div>
  );
}

function VideoGrid({
  entries,
  eager,
  ...actions
}: TileActions & { entries: RankedTopicVideo[]; eager: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry, index) => (
        <VideoTile key={entry.video.youtube_video_id} entry={entry} eagerImage={eager && index < 3} {...actions} />
      ))}
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

function useThumbnail(videoId: string, stored: string | null | undefined) {
  // maxresdefault does not exist for every video; hqdefault always does, and
  // object-cover in the frame crops its letterbox bars away.
  const fallback = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const [src, setSrc] = useState(stored ?? fallback);
  const [loaded, setLoaded] = useState(false);
  return {
    src,
    loaded,
    onError: () => setSrc(fallback),
    // A missing size comes back as YouTube's 120px grey placeholder, not an error.
    onLoad: (event: React.SyntheticEvent<HTMLImageElement>) => {
      if (event.currentTarget.naturalWidth <= 120 && src !== fallback) {
        setSrc(fallback);
        return;
      }
      setLoaded(true);
    },
  };
}

function Thumbnail({
  entry,
  href,
  aspect,
  eager,
  selected,
  selecting,
  onToggle,
}: {
  entry: RankedTopicVideo;
  href: string;
  aspect: "video" | "short";
  eager: boolean;
  selected: boolean;
  selecting: boolean;
  onToggle: () => void;
}) {
  const { video } = entry;
  const thumb = useThumbnail(video.youtube_video_id, video.thumbnail_url);
  return (
    <div className="group/thumb relative">
      <Link
        href={href}
        className={cn(
          "relative block overflow-hidden rounded-xl bg-muted",
          aspect === "short" ? "aspect-[9/16]" : "aspect-video",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
      >
        {!thumb.loaded && <span aria-hidden className="absolute inset-0 animate-pulse bg-muted" />}
        <Image
          src={thumb.src}
          alt=""
          fill
          unoptimized
          loading={eager ? "eager" : "lazy"}
          className="object-cover"
          onError={thumb.onError}
          onLoad={thumb.onLoad}
        />
        {/* ui-exception: ink on a photo is fixed white on a dark scrim (YouTube's own convention). */}
        {aspect === "video" && video.duration && (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1 py-0.5 type-meta font-medium tabular-nums text-white">
            {formatYouTubeDuration(video.duration)}
          </span>
        )}
      </Link>
      <div
        className={cn(
          "absolute right-2 top-2 rounded-md bg-card p-1 shadow-sm transition-opacity",
          selected || selecting
            ? "opacity-100"
            : "opacity-0 focus-within:opacity-100 group-hover/thumb:opacity-100 [@media(hover:none)]:opacity-100",
        )}
      >
        <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Select ${video.title ?? "video"}`} />
      </div>
    </div>
  );
}

function VideoMenu({
  entry,
  href,
  selected,
  onToggle,
  analyzing,
  onAnalyze,
}: {
  entry: RankedTopicVideo;
  href: string;
  selected: boolean;
  onToggle: () => void;
  analyzing: boolean;
  onAnalyze: () => void;
}) {
  const { video } = entry;
  const analyzed = videoReadState(video) === "analyzed";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button icon={<MoreVertical />} aria-label="Video actions" variant="quiet" className="-mr-2 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem asChild>
          <Link href={href}>
            <PanelTop className="mr-2 h-4 w-4" />
            Open video page
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openOutbound(video.canonical_url, "_blank")}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Watch on YouTube
        </DropdownMenuItem>
        <DropdownMenuItem disabled={analyzed || analyzing} onClick={onAnalyze}>
          {analyzing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
          {analyzed ? "Analyzed" : analyzing ? "Analyzing" : "Analyze"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggle}>
          <SquareCheck className="mr-2 h-4 w-4" />
          {selected ? "Deselect" : "Select"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="whitespace-normal">
          Match {entry.score.score} · #{entry.rank}
          <span className="mt-0.5 block font-normal">{scoreExplanation(entry)}</span>
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AnalyzedMark({ entry, analyzing }: { entry: RankedTopicVideo; analyzing: boolean }) {
  if (analyzing) {
    return (
      <>
        <span aria-hidden> · </span>
        <LoaderCircle aria-hidden className="inline size-3.5 -translate-y-px animate-spin" />
        <span> Analyzing</span>
      </>
    );
  }
  if (videoReadState(entry.video) !== "analyzed") return null;
  return (
    <>
      <span aria-hidden> · </span>
      <CheckCircle2 aria-label="Analyzed" className="inline size-3.5 -translate-y-px" />
    </>
  );
}

function VideoTile({
  entry,
  eagerImage,
  selected,
  onToggle,
  analyzing,
  onAnalyze,
}: TileActions & { entry: RankedTopicVideo; eagerImage: boolean }) {
  const { video } = entry;
  const id = video.youtube_video_id;
  const href = marketingRoutes.youtubeVideo(id);
  const isSelected = selected.has(id);
  const meta = [
    video.view_count != null ? `${formatYouTubeCount(video.view_count)} views` : null,
    video.published_at ? formatRelativeTime(video.published_at, { style: "intl" }) : null,
  ].filter(Boolean);

  return (
    <article className="flex min-w-0 flex-col gap-3">
      <Thumbnail
        entry={entry}
        href={href}
        aspect="video"
        eager={eagerImage}
        selected={isSelected}
        selecting={selected.size > 0}
        onToggle={() => onToggle(id)}
      />
      <div className="flex gap-3">
        <ChannelAvatar entry={entry} />
        <div className="min-w-0 flex-1">
          {/* ui-exception: flagship stage — a video title reads at YouTube's own size. */}
          <Link href={href} className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground" title={video.title ?? undefined}>
            {video.title ?? "Untitled video"}
          </Link>
          <p className="mt-1 truncate type-secondary text-muted-foreground">{video.channel_title ?? "YouTube creator"}</p>
          <p className="truncate type-secondary tabular-nums text-muted-foreground">
            {meta.join(" · ")}
            <AnalyzedMark entry={entry} analyzing={analyzing.has(id)} />
          </p>
        </div>
        <VideoMenu
          entry={entry}
          href={href}
          selected={isSelected}
          onToggle={() => onToggle(id)}
          analyzing={analyzing.has(id)}
          onAnalyze={() => onAnalyze(id)}
        />
      </div>
    </article>
  );
}

function ShortTile({ entry, selected, onToggle, analyzing, onAnalyze }: TileActions & { entry: RankedTopicVideo }) {
  const { video } = entry;
  const id = video.youtube_video_id;
  const href = marketingRoutes.youtubeVideo(id);
  const isSelected = selected.has(id);
  return (
    <article className="flex min-w-0 flex-col gap-2">
      <Thumbnail
        entry={entry}
        href={href}
        aspect="short"
        eager={false}
        selected={isSelected}
        selecting={selected.size > 0}
        onToggle={() => onToggle(id)}
      />
      <div className="flex gap-1">
        <div className="min-w-0 flex-1">
          <Link href={href} className="line-clamp-2 type-title text-foreground" title={video.title ?? undefined}>
            {video.title ?? "Untitled short"}
          </Link>
          <p className="truncate type-secondary tabular-nums text-muted-foreground">
            {video.view_count != null ? `${formatYouTubeCount(video.view_count)} views` : "—"}
            <AnalyzedMark entry={entry} analyzing={analyzing.has(id)} />
          </p>
        </div>
        <VideoMenu
          entry={entry}
          href={href}
          selected={isSelected}
          onToggle={() => onToggle(id)}
          analyzing={analyzing.has(id)}
          onAnalyze={() => onAnalyze(id)}
        />
      </div>
    </article>
  );
}

function ChannelAvatar({ entry }: { entry: RankedTopicVideo }) {
  const { video, channelThumbnail } = entry;
  const [failed, setFailed] = useState(false);
  if (channelThumbnail && !failed) {
    return (
      <Image
        src={channelThumbnail}
        alt=""
        width={36}
        height={36}
        unoptimized
        className="mt-0.5 size-9 shrink-0 rounded-full bg-muted object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return <UserAvatarDisplay user={{ id: video.channel_id, name: video.channel_title }} size="sm" className="mt-0.5 shrink-0" />;
}

