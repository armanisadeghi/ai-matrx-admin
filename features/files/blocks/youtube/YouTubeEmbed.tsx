"use client";

import React, { useState } from "react";
import { PlayIcon, ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  youTubeEmbedUrl,
  youTubeThumbnail,
  youTubeWatchUrl,
} from "@ai-matrx/rich-content/utils/youtube";
import { VideoPublishDate } from "@/features/files/blocks/video/VideoPublishDate";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

interface YouTubeEmbedProps {
  /** The 11-ish char YouTube video id. */
  videoId: string;
  /** Start offset in whole seconds (the `?t=` / `?start=` token). */
  start?: number;
  /** Accessible label / caption. */
  title?: string;
  /**
   * Poster image to show before play. Defaults to YouTube's `maxres` thumbnail,
   * stepping down `sd` → `hq` when a size is missing (see `nextYouTubePoster`).
   * Pass the thumbnail from the source markdown when available so the facade
   * matches what the author embedded.
   */
  poster?: string;
  /** Provider publish timestamp when the upstream block carries it. */
  publishedAt?: string | null;
  className?: string;
}

/**
 * The one reusable YouTube embed for the whole app.
 *
 * Click-to-play facade: shows a poster thumbnail + play button and only mounts
 * the (heavy, cookie-laden) YouTube iframe on click — so a page with many
 * videos never loads N players at once, and no YouTube cookies are set until
 * the user actually plays. Uses the privacy-enhanced `youtube-nocookie.com`
 * domain and honors a start offset.
 *
 * Fed by both the markdown `youtube` block (client-detected links) and the
 * server `media_block(kind: "youtube")` render block — one component, one look.
 */
/** YouTube's "no such thumbnail" answer: a 404 whose body is a decodable 120×90 grey JPEG. */
const YT_MISSING_POSTER_WIDTH = 120;
const POSTER_CHAIN = ["maxres", "sd", "hq"] as const;

/**
 * The next poster to try after `current` failed. A missing `maxresdefault` /
 * `sddefault` does NOT fire `onError` — YouTube answers 404 with a decodable
 * 120×90 grey placeholder — so a load whose natural width is the placeholder's
 * counts as a miss too. `hq` exists for every video; null = nothing left.
 */
export function nextYouTubePoster(videoId: string, current: string): string | null {
  const at = POSTER_CHAIN.findIndex((q) => youTubeThumbnail(videoId, q) === current);
  const next = at >= 0 ? POSTER_CHAIN[at + 1] : "hq";
  if (!next) return null;
  const src = youTubeThumbnail(videoId, next);
  return src === current ? null : src;
}

export function isMissingYouTubePoster(img: { naturalWidth: number }): boolean {
  return img.naturalWidth > 0 && img.naturalWidth <= YT_MISSING_POSTER_WIDTH;
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  videoId,
  start,
  title,
  poster,
  publishedAt,
  className,
}) => {
  const [playing, setPlaying] = useState(false);
  const [posterSrc, setPosterSrc] = useState(
    poster ?? youTubeThumbnail(videoId, "maxres"),
  );
  const label = title || "YouTube video";

  return (
    <div
      className={cn(
        "my-3 overflow-hidden rounded-lg border border-border bg-black",
        className,
      )}
    >
      <div className="relative aspect-video w-full">
        {playing ? (
          <iframe
            src={youTubeEmbedUrl(videoId, { start, autoplay: true })}
            aria-label={label}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 h-full w-full"
            aria-label={`Play ${label}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterSrc}
              alt={label}
              loading="lazy"
              className="h-full w-full object-cover"
              // A poster fills its 16:9 facade by design (hq carries letterbox bars):
              // the playground's image check reads this mark and never calls it cropped.
              data-matrx-poster=""
              onLoad={(e) => {
                if (!isMissingYouTubePoster(e.currentTarget)) return;
                const next = nextYouTubePoster(videoId, posterSrc);
                if (next) setPosterSrc(next);
              }}
              onError={() => {
                const next = nextYouTubePoster(videoId, posterSrc);
                if (next) setPosterSrc(next);
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/0">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-colors group-hover:bg-red-600">
                <PlayIcon className="ml-0.5 h-7 w-7 fill-white text-white" />
              </span>
            </span>
          </button>
        )}
        <VideoPublishDate
          publishedAt={publishedAt}
          className="pointer-events-none absolute left-2 top-2 z-10 rounded bg-black/75 px-1.5 py-0.5 text-white shadow-sm"
        />
      </div>
      {title ? (
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
          <p
            className="flex-1 truncate text-xs text-foreground/80"
            title={title}
          >
            {title}
          </p>
          <OutboundLink
            href={youTubeWatchUrl(videoId, start)}
            className="shrink-0 text-muted-foreground/60 transition-colors hover:text-foreground"
            title="Open on YouTube"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </OutboundLink>
        </div>
      ) : null}
    </div>
  );
};

export default YouTubeEmbed;
