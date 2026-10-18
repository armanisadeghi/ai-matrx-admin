"use client";

/**
 * Shared visual primitives for the search kind family — the convergence of
 * the platform's best search renderers (Inventory Law survey, 2026-08-20):
 * URL/domain/favicon/site-name/breadcrumb/date logic comes from the canonical
 * `parseSearch.ts` (tool-call-visualization search renderer — never
 * re-implemented), and the favicon fallback uses the canonical `SiteIcon`.
 *
 * Provider thumbnails/favicons are EXTERNAL media (not ours): a plain <img>
 * with an onError fallback is the correct treatment (media-durability law
 * applies to OUR files only).
 */

import React from "react";
import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";
import { SiteIcon } from "@ai-matrx/design-system/site-icon";
import {
  getBreadcrumbParts,
} from "@ai-matrx/chat/tool-call-visualization/renderers/search/parseSearch";

/**
 * A result's site icon: the provider's own icon URL when it sent one, else the
 * site's real icon from its URL, the Globe only as a last resort. The canonical
 * `SiteIcon` owns the fallback chain and the reserved, shimmering box.
 */
export const SearchFavicon: React.FC<{
  /** Provider-supplied icon URL (favicon / source_logo), when it sent one. */
  iconUrl?: string | null;
  /** The result URL (or hostname) the site icon is derived from. */
  url?: string | null;
  size?: number;
  className?: string;
}> = ({ iconUrl, url, size = 16, className }) => (
  <SiteIcon site={url} iconUrl={iconUrl} size={size} className={className} />
);

/** Google-style `origin › segment › segment` line. */
export const BreadcrumbLine: React.FC<{
  url?: string | null;
  /** Provider's own "site › path" display form — preferred verbatim. */
  displayedUrl?: string | null;
  className?: string;
}> = ({ url, displayedUrl, className }) => {
  if (displayedUrl) {
    return (
      <div className={cn("truncate text-xs text-muted-foreground", className)}>
        {displayedUrl}
      </div>
    );
  }
  if (!url) return null;
  const { origin, segments } = getBreadcrumbParts(url);
  return (
    <div className={cn("truncate text-xs text-muted-foreground", className)}>
      <span className="text-success">{origin}</span>
      {segments.map((segment, i) => (
        <span key={i}>
          <span className="mx-1 opacity-60">›</span>
          {segment}
        </span>
      ))}
    </div>
  );
};

/**
 * THE canonical inline renderer for the `rating` primitive kind — stars
 * scaled to `best_possible`, the numeric value, and the review count.
 * `RatingBlock` (standalone dispatch) and every parent kind (web_result,
 * local_place, entity_card) compose this one component.
 */
export const RatingStars: React.FC<{
  value: number;
  bestPossible?: number | null;
  count?: number | null;
  className?: string;
}> = ({ value, bestPossible, count, className }) => {
  const scale = bestPossible && bestPossible > 0 ? bestPossible : 5;
  const onFive = Math.max(0, Math.min(5, (value / scale) * 5));
  const full = Math.floor(onFive + 0.25);
  const half = onFive - full >= 0.25;
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs", className)}
      title={`${value} / ${scale}`}
    >
      <span className="inline-flex text-warning" aria-hidden>
        {Array.from({ length: 5 }, (_, i) =>
          i < full ? (
            <Star key={i} className="h-3.5 w-3.5 fill-current" />
          ) : i === full && half ? (
            <StarHalf key={i} className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Star key={i} className="h-3.5 w-3.5 opacity-25" />
          ),
        )}
      </span>
      <span className="font-medium text-foreground">
        {Number.isInteger(value) ? value : value.toFixed(1)}
      </span>
      {typeof count === "number" && count > 0 && (
        <span className="text-muted-foreground">
          ({Intl.NumberFormat().format(count)})
        </span>
      )}
    </span>
  );
};

/** Small muted chip (tags, categories, related searches). */
export const SearchChip: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <span
    title={typeof children === "string" ? children : undefined}
    className={cn(
      // A chip holds a SHORT label (pill guard budget 320px): long related
      // questions truncate, the full text rides the title.
      "inline-block max-w-[min(100%,18rem)] truncate rounded-full border border-border bg-muted/40 px-2 py-0.5 align-middle text-xs text-muted-foreground",
      className,
    )}
  >
    {children}
  </span>
);

/** Section heading inside the collection — one quiet row: icon, label, count. */
export const SectionHeading: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
}> = ({ icon: Icon, label, count }) => (
  <div className="mb-2.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
    <Icon className="h-4 w-4 text-muted-foreground" />
    <span>{label}</span>
    {typeof count === "number" && count > 0 && (
      <span className="tabular-nums text-muted-foreground">{count}</span>
    )}
  </div>
);
