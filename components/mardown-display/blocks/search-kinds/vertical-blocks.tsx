"use client";

/**
 * The canonical components for the Google-only search verticals (universal
 * search, 2026-10-14): `product_result` + its collection `shopping_results`,
 * and `job_result` + its collection `job_search_results`. Each item kind is
 * composed by its collection through `SearchKindNested` (one component per
 * shape, everywhere).
 *
 * The kinds are registered by aidream's search-kinds lane; until the
 * generated types carry them, values are read defensively (`text`/`num`) —
 * never through a hand-written interface (THE twin law). Field names follow
 * the server contract with the provider's common aliases tolerated.
 *
 * Every door opens in a new tab (`OutboundLink`); every card is a fixed shape,
 * so a grid never shifts while images load.
 */

import React, { useState } from "react";
import {
  Briefcase,
  Clock,
  ExternalLink,
  ShoppingBag,
  Truck,
  Wallet,
} from "lucide-react";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { cn } from "@/lib/utils";
import { SearchKindNested } from "./SearchKindNested";
import { RatingStars, SearchChip, SearchFavicon } from "./search-kind-shared";
import { isRecord, num, records, strings, text } from "./search-kind-data";

interface BlockProps {
  serverData?: unknown;
  className?: string;
}

/** Either handoff shape (`{value, isComplete}` or the bare value) → the value. */
export function kindValue(serverData: unknown): Record<string, unknown> {
  if (!isRecord(serverData)) return {};
  return isRecord(serverData.value) ? serverData.value : serverData;
}

/** First present string among several field names. */
function first(value: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const found = text(value[key]);
    if (found) return found;
  }
  return null;
}

function firstNum(value: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const found = num(value[key]);
    if (found !== null) return found;
  }
  return null;
}

/** A rating as either a nested `rating` kind or a bare number beside a count. */
function ratingOf(value: Record<string, unknown>): {
  value: number;
  count: number | null;
} | null {
  if (isRecord(value.rating)) {
    const v = num(value.rating.value);
    return v === null ? null : { value: v, count: num(value.rating.count) };
  }
  const v = num(value.rating);
  return v === null
    ? null
    : { value: v, count: firstNum(value, "reviews_count", "review_count", "reviews") };
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** An external picture that quietly becomes a glyph when it fails. */
function Picture({
  src,
  alt,
  fallback: Fallback,
  className,
}: {
  src: string | null;
  alt: string;
  fallback: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className,
        )}
      >
        <Fallback className="h-6 w-6" />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// product_result — one shopping offer (Google's product tile)
// ─────────────────────────────────────────────────────────────────────────────

export function ProductResultBlock({ serverData, className }: BlockProps) {
  const value = kindValue(serverData);
  const title = first(value, "title", "name");
  if (!title) return null;
  const url = first(value, "url", "product_url", "link", "product_link");
  const merchant = first(value, "merchant", "store", "seller", "source_name");
  const merchantLogo = first(value, "merchant_logo", "source_icon", "store_logo");
  const price = first(value, "price_text", "price");
  const oldPrice = first(value, "old_price_text", "old_price", "original_price_text");
  const delivery = first(value, "delivery_text", "delivery", "shipping_text");
  const badge = first(value, "badge", "tag");
  const thumb = first(value, "thumbnail", "image_url", "image");
  const rating = ratingOf(value);

  return (
    <OutboundLink
      href={url ?? undefined}
      onClick={(e) => e.stopPropagation()}
      data-clickable
      className={cn(
        "group flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40",
        className,
      )}
    >
      <span className="block aspect-square w-full overflow-hidden bg-white p-3">
        <Picture
          src={thumb}
          alt={title}
          fallback={ShoppingBag}
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 px-3 pb-3 pt-2">
        <span className="line-clamp-2 min-h-[2.5rem] text-sm text-foreground group-hover:text-primary">
          {title}
        </span>
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="text-base font-semibold tabular-nums text-foreground">
            {price ?? "See price"}
          </span>
          {oldPrice && (
            <span className="truncate text-xs tabular-nums text-muted-foreground line-through">
              {oldPrice}
            </span>
          )}
        </span>
        {merchant && (
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <SearchFavicon iconUrl={merchantLogo} url={url} className="h-3.5 w-3.5" />
            <span className="truncate">{merchant}</span>
          </span>
        )}
        {rating && (
          <RatingStars value={rating.value} count={rating.count} />
        )}
        {(delivery || badge) && (
          <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            {delivery ? <Truck className="h-3.5 w-3.5 shrink-0" /> : null}
            <span className="truncate">{delivery ?? badge}</span>
          </span>
        )}
      </span>
    </OutboundLink>
  );
}

/** `shopping_results` — the product grid. */
export function ShoppingResultsBlock({ serverData, className }: BlockProps) {
  const value = kindValue(serverData);
  const products = records(value.products);
  if (products.length === 0) return null;
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {products.map((product, i) => (
        <SearchKindNested
          key={text(product.url) ?? text(product.product_id) ?? i}
          value={{ __kind: "product_result", ...product }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// job_result — one job listing (Google for Jobs card)
// ─────────────────────────────────────────────────────────────────────────────

interface ApplyOption {
  title: string;
  url: string;
}

function applyOptions(value: Record<string, unknown>): ApplyOption[] {
  const out: ApplyOption[] = [];
  for (const opt of records(value.apply_options)) {
    const url = first(opt, "url", "link");
    if (url) out.push({ title: first(opt, "title", "name") ?? hostOf(url) ?? "Apply", url });
  }
  const direct = first(value, "apply_url", "url", "share_url", "link");
  if (out.length === 0 && direct) {
    out.push({ title: first(value, "via", "source") ?? hostOf(direct) ?? "Apply", url: direct });
  }
  return out;
}

export function JobResultBlock({ serverData, className }: BlockProps) {
  const value = kindValue(serverData);
  const title = first(value, "title");
  const [open, setOpen] = useState(false);
  if (!title) return null;
  const company = first(value, "company_name", "company", "employer");
  const location = first(value, "location");
  const via = first(value, "via", "source");
  const posted = first(value, "posted_text", "posted_at_text", "posted_at");
  const salary = first(value, "salary_text", "salary");
  const schedule = first(value, "schedule_type", "employment_type");
  const logo = first(value, "thumbnail", "company_logo", "logo");
  const description = first(value, "description", "snippet");
  const extras = strings(value.extensions).filter(
    (e) => e !== posted && e !== salary && e !== schedule,
  );
  const applies = applyOptions(value);
  const initial = (company ?? title).charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "flex min-w-0 gap-3 rounded-xl border border-border bg-card p-3.5",
        className,
      )}
    >
      {logo ? (
        <Picture
          src={logo}
          alt=""
          fallback={Briefcase}
          className="h-11 w-11 shrink-0 rounded-lg border border-border bg-white"
        />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-base font-semibold text-muted-foreground">
          {initial}
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        {applies[0] ? (
          <OutboundLink
            href={applies[0].url}
            onClick={(e) => e.stopPropagation()}
            className="block text-base font-medium leading-snug text-primary underline-offset-2 hover:underline"
          >
            {title}
          </OutboundLink>
        ) : (
          <div className="text-base font-medium leading-snug text-foreground">{title}</div>
        )}
        <div className="truncate text-sm text-foreground">
          {[company, location].filter(Boolean).join(" · ")}
        </div>
        {via && (
          <div className="truncate text-xs text-muted-foreground">via {via.replace(/^via\s+/i, "")}</div>
        )}
        {(posted || salary || schedule || extras.length > 0) && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {posted && (
              <SearchChip>
                <Clock className="mr-1 inline h-3 w-3" />
                {posted}
              </SearchChip>
            )}
            {salary && (
              <SearchChip>
                <Wallet className="mr-1 inline h-3 w-3" />
                {salary}
              </SearchChip>
            )}
            {schedule && <SearchChip>{schedule}</SearchChip>}
            {extras.slice(0, 3).map((e) => (
              <SearchChip key={e}>{e}</SearchChip>
            ))}
          </div>
        )}
        {description && (
          <div className="pt-0.5">
            <p
              className={cn(
                "whitespace-pre-line text-sm text-muted-foreground",
                !open && "line-clamp-2",
              )}
            >
              {description}
            </p>
            {description.length > 180 && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="text-xs font-medium text-primary hover:underline"
              >
                {open ? "Less" : "More"}
              </button>
            )}
          </div>
        )}
        {applies.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-sm">
            {applies.slice(0, 3).map((a) => (
              <OutboundLink
                key={a.url}
                href={a.url}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex max-w-[16rem] items-center gap-1 text-primary underline-offset-2 hover:underline"
              >
                <span className="truncate">Apply on {a.title.replace(/^apply (on|at)\s+/i, "")}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </OutboundLink>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** `job_search_results` — the job list. */
export function JobSearchResultsBlock({ serverData, className }: BlockProps) {
  const value = kindValue(serverData);
  const jobs = records(value.jobs);
  if (jobs.length === 0) return null;
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {jobs.map((job, i) => (
        <SearchKindNested
          key={text(job.job_id) ?? `${text(job.title)}-${i}`}
          value={{ __kind: "job_result", ...job }}
        />
      ))}
    </div>
  );
}
