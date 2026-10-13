"use client";

/**
 * `image_result` — THE canonical component for one image-search hit
 * (Search Lab, 2026-10-13). Dispatched standalone by the block registry AND
 * composed by `WebSearchResultsBlock`'s Images band through `SearchKindNested`.
 *
 * The card is a FIXED-ASPECT box, so a grid of them never shifts as images
 * load: the thumbnail (falling back to the full image, then to a glyph) fills
 * it with `object-cover`. Two doors, both new-tab: the picture opens the
 * original image; the source line opens the page that hosts it.
 *
 * TYPES come from the registry (`readSearchKindValue<"image_result">`); the
 * live registry's bundled web component row uses component_key "image_result".
 */

import React, { useState } from "react";
import { ExternalLink, ImageOff } from "lucide-react";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { cn } from "@/lib/utils";
import { num, readSearchKindValue, text } from "./search-kind-data";

interface ImageResultBlockProps {
  serverData?: unknown;
  className?: string;
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function ImageResultBlock({ serverData, className }: ImageResultBlockProps) {
  const { value } = readSearchKindValue<"image_result">(serverData);
  const imageUrl = text(value.image_url);
  const thumbnail = text(value.thumbnail);
  const pageUrl = text(value.page_url);
  const title = text(value.title);
  // Each candidate source is tried in order; a failed load moves to the next.
  const sources = [thumbnail, imageUrl].filter((s): s is string => s !== null);
  const [failedCount, setFailedCount] = useState(0);
  if (!imageUrl && !thumbnail) return null;

  const src = sources[failedCount] ?? null;
  const site = text(value.site_name) ?? hostOf(pageUrl);
  const width = num(value.width);
  const height = num(value.height);
  const dims = width && height ? `${width}×${height}` : null;

  return (
    <div
      className={cn(
        "group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40",
        className,
      )}
    >
      <OutboundLink
        href={imageUrl ?? thumbnail ?? undefined}
        onClick={(e) => e.stopPropagation()}
        title={title ?? "Open image"}
        className="block aspect-[4/3] w-full overflow-hidden bg-muted"
      >
        {src ? (
          <img
            key={src}
            src={src}
            alt={title ?? ""}
            loading="lazy"
            onError={() => setFailedCount((n) => n + 1)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-6 w-6" />
          </span>
        )}
      </OutboundLink>
      <div className="flex min-w-0 flex-col gap-0.5 px-2 py-1.5">
        <div className="truncate text-xs font-medium text-foreground">
          {title ?? site ?? "Image"}
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {pageUrl ? (
            <OutboundLink
              href={pageUrl}
              onClick={(e) => e.stopPropagation()}
              title="Open source page"
              className="flex min-w-0 items-center gap-1 hover:text-primary"
            >
              <span className="truncate">{site ?? "Source page"}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </OutboundLink>
          ) : (
            site && <span className="truncate">{site}</span>
          )}
          {dims && <span className="ml-auto shrink-0 tabular-nums">{dims}</span>}
        </div>
      </div>
    </div>
  );
}
