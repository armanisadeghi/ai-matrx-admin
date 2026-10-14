"use client";

/**
 * Canonical components for `local_place`, `entity_card`, and `ai_answer`.
 * Nested primitive kinds (rating / postal_address / opening_hours /
 * geo_coordinates) render through THEIR canonical components — composed, not
 * re-implemented.
 */

import React, { useState } from "react";
import { ChevronDown, Clock, Globe, Navigation, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhoneNumber } from "@/lib/sms/phoneUtils";
import {
  isRecord,
  num,
  readSearchKindValue,
  items,
  strings,
  text,
} from "./search-kind-data";
import { SearchChip, SearchFavicon } from "./search-kind-shared";
import {
  GeoCoordinatesBlock,
  OpeningHoursBlock,
  PostalAddressBlock,
  RatingBlock,
} from "./primitive-blocks";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { searchEngineLabel } from "@/features/search/types";

interface SearchKindBlockProps {
  serverData?: unknown;
  className?: string;
}

const ExtThumb: React.FC<{ src: string; className?: string }> = ({
  src,
  className,
}) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// local_place
// ─────────────────────────────────────────────────────────────────────────────

export function LocalPlaceBlock({
  serverData,
  className,
}: SearchKindBlockProps) {
  const { value } = readSearchKindValue<"local_place">(serverData);
  const name = text(value.name);
  if (!name) return null;

  const website = text(value.website_url);
  const phone = text(value.phone);
  // Providers repeat a category in two casings ("cafe", "Cafe"): one chip each.
  const seen = new Set<string>();
  const chips = [...strings(value.categories), ...strings(value.cuisine)]
    .map((chip) => chip.charAt(0).toUpperCase() + chip.slice(1))
    .filter(
    (chip) => {
      const key = chip.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    },
  );
  const price = text(value.price_text);
  const thumbnail = text(value.thumbnail);
  const hoursText = text(value.hours_text);
  const description = text(value.description);
  const coords = isRecord(value.coordinates) ? value.coordinates : null;
  const lat = coords ? num(coords.latitude) : null;
  const lon = coords ? num(coords.longitude) : null;
  const mapUrl =
    lat !== null && lon !== null
      ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`
      : null;
  // Google's local-pack line: type · price under the name. A short
  // description is a type label ("Bakery"); a long one is a blurb of its own.
  const descIsType = description !== null && description.length <= 32;
  const type = descIsType ? description : (chips[0] ?? null);
  const typeLine = [type, price].filter(Boolean).join(" · ");
  const extraChips = chips.filter(
    (chip) => chip.toLowerCase() !== (type ?? "").toLowerCase(),
  );
  const blurb = descIsType ? null : description;

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-xl border border-border bg-card p-3.5",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        {website ? (
          <OutboundLink
            href={website}
            onClick={(e) => e.stopPropagation()}
            className="block truncate text-base font-medium text-primary underline-offset-2 hover:underline"
          >
            {name}
          </OutboundLink>
        ) : (
          <div className="truncate text-base font-medium text-foreground">{name}</div>
        )}

        {isRecord(value.rating) && <RatingBlock serverData={value.rating} />}

        {typeLine && (
          <div className="truncate text-sm text-muted-foreground">{typeLine}</div>
        )}

        {blurb && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{blurb}</p>
        )}

        {isRecord(value.address) && (
          <PostalAddressBlock serverData={value.address} className="w-full" />
        )}

        {isRecord(value.hours) ? (
          <OpeningHoursBlock serverData={value.hours} />
        ) : (
          hoursText && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{hoursText}</span>
            </div>
          )
        )}

        {extraChips.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {extraChips.slice(0, 4).map((chip, i) => (
              <SearchChip key={i}>{chip}</SearchChip>
            ))}
          </div>
        )}

        {(website || mapUrl || phone) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-sm">
            {website && (
              <OutboundLink
                href={website}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-primary underline-offset-2 hover:underline"
              >
                <Globe className="h-3.5 w-3.5" />
                Website
              </OutboundLink>
            )}
            {mapUrl && (
              <OutboundLink
                href={mapUrl}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-primary underline-offset-2 hover:underline"
              >
                <Navigation className="h-3.5 w-3.5" />
                Map
              </OutboundLink>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 tabular-nums text-muted-foreground hover:text-primary"
              >
                <Phone className="h-3.5 w-3.5" />
                {formatPhoneNumber(phone)}
              </a>
            )}
          </div>
        )}
      </div>

      {thumbnail && (
        <ExtThumb
          src={thumbnail}
          className="h-16 w-16 flex-shrink-0 rounded-lg bg-muted object-cover @md:h-[88px] @md:w-[88px]"
        />
      )}
    </div>
  );
}

/**
 * A knowledge-panel fact as plain text. Infobox scrapes carry markup
 * ("<span><strong>Naming</strong></span>") and placeholder values ("None");
 * neither is ever shown — markup is stripped, a placeholder drops the row.
 */
function factLine(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const clean = raw
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean || /^(none|null|undefined|n\/a)$/i.test(clean)) return null;
  return clean;
}

// ─────────────────────────────────────────────────────────────────────────────
// entity_card — the knowledge-panel card (e.g. built from Wikipedia).
// ─────────────────────────────────────────────────────────────────────────────

export function EntityCardBlock({
  serverData,
  className,
}: SearchKindBlockProps) {
  const { value } = readSearchKindValue<"entity_card">(serverData);
  const name = text(value.name);
  if (!name) return null;

  const image = text(value.image);
  const website = text(value.website_url);
  const sourceUrl = text(value.source_url);
  const facts = items(value.facts);
  const profiles = items(value.profiles);
  const description = text(value.long_description) ?? text(value.description);
  const category = text(value.category);

  return (
    <div
      className={cn("rounded-xl border border-border bg-card p-4", className)}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold leading-tight text-foreground">{name}</div>
          {category && (
            <div className="mt-0.5 text-sm text-muted-foreground">
              {/* Providers send a type word ("place"): shown as a label. */}
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </div>
          )}
          {isRecord(value.rating) && (
            <div className="mt-1">
              <RatingBlock serverData={value.rating} />
            </div>
          )}
        </div>
        {image && (
          <ExtThumb
            src={image}
            className="h-20 w-20 flex-shrink-0 rounded-lg bg-muted object-cover"
          />
        )}
      </div>

      {description && (
        <p className="mt-2.5 line-clamp-6 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {/* Outside the clamp: a long description must never swallow its door. */}
      {description && sourceUrl && (
        <OutboundLink
          href={sourceUrl}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 inline-block text-sm text-primary underline-offset-2 hover:underline"
        >
          Source
        </OutboundLink>
      )}

      {facts.length > 0 && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-border pt-3 text-sm">
          {facts.slice(0, 8).map((fact, i) => {
            const label = factLine(fact.label);
            const factText = factLine(fact.text);
            if (!label || !factText) return null;
            const links = strings(fact.links);
            return (
              <React.Fragment key={i}>
                <dt className="font-medium text-foreground">{label}</dt>
                <dd className="line-clamp-3 min-w-0 text-muted-foreground" title={factText}>
                  {links.length > 0 ? (
                    <OutboundLink
                      href={links[0]}
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {factText}
                    </OutboundLink>
                  ) : (
                    factText
                  )}
                </dd>
              </React.Fragment>
            );
          })}
        </dl>
      )}

      {isRecord(value.coordinates) && (
        <div className="mt-2">
          <GeoCoordinatesBlock serverData={value.coordinates} />
        </div>
      )}

      {(profiles.length > 0 || website) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {website && (
            <OutboundLink
              href={website}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Globe className="h-3.5 w-3.5" />
              Website
            </OutboundLink>
          )}
          {profiles.slice(0, 8).map((profile, i) => {
            const pName = text(profile.name);
            const pUrl = text(profile.url);
            if (!pName || !pUrl) return null;
            return (
              <OutboundLink
                key={i}
                href={pUrl}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <SearchFavicon
                  iconUrl={text(profile.favicon)}
                  url={pUrl}
                  className="h-3.5 w-3.5 flex-shrink-0"
                />
                {pName}
              </OutboundLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ai_answer — the provider's synthesized answer with its references.
// ─────────────────────────────────────────────────────────────────────────────

/** `[2]`, `[0][2]`, `[1, 3]` — a provider's inline citation markers. */
const CITATION_RE = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

function citationIndexes(blocks: { text?: unknown; items?: unknown }[]): number[] {
  const all: number[] = [];
  for (const block of blocks) {
    const parts = [text(block.text) ?? "", ...strings(block.items)];
    for (const part of parts) {
      for (const match of part.matchAll(CITATION_RE)) {
        for (const n of match[1].split(",")) all.push(parseInt(n, 10));
      }
    }
  }
  return all;
}

type AnswerRef = { url: string; label: string };

/** Inline text: `**bold**` / `*em*` and citation markers as numbered doors. */
function AnswerInline({
  value: raw,
  refs,
  base,
}: {
  value: string;
  refs: AnswerRef[];
  base: number;
}) {
  // "…Tibet[1]." → "…Tibet.[1]": the marker sits after the punctuation.
  const value = raw.replace(/\s*((?:\[\d+(?:\s*,\s*\d+)*\])+)([.,;:!?])/g, "$2$1");
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  const pushText = (chunk: string) => {
    // Emphasis is the only markdown a provider answer carries inline.
    const pieces = chunk.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
    for (const piece of pieces) {
      if (!piece) continue;
      if (piece.startsWith("**") && piece.endsWith("**") && piece.length > 4) {
        out.push(
          <strong key={key++} className="font-semibold text-foreground">
            {piece.slice(2, -2)}
          </strong>,
        );
      } else if (piece.startsWith("*") && piece.endsWith("*") && piece.length > 2) {
        out.push(<em key={key++}>{piece.slice(1, -1)}</em>);
      } else {
        out.push(piece);
      }
    }
  };
  for (const match of value.matchAll(CITATION_RE)) {
    const at = match.index ?? 0;
    pushText(value.slice(last, at).replace(/\s+$/, ""));
    for (const n of match[1].split(",")) {
      const index = parseInt(n, 10) - base;
      const ref = refs[index];
      out.push(
        ref ? (
          <OutboundLink
            key={key++}
            href={ref.url}
            onClick={(e) => e.stopPropagation()}
            title={ref.label}
            className="mx-px inline-flex h-4 min-w-4 -translate-y-px items-center justify-center rounded bg-muted px-1 align-middle text-[10px] font-medium tabular-nums text-muted-foreground no-underline hover:bg-primary/15 hover:text-primary"
          >
            {index + 1}
          </OutboundLink>
        ) : null,
      );
    }
    last = at + match[0].length;
  }
  pushText(value.slice(last));
  return <>{out}</>;
}

/** Answers longer than this open collapsed (decided from the text, not measured: no shift). */
const ANSWER_COLLAPSE_CHARS = 700;

export function AiAnswerKindBlock({
  serverData,
  className,
}: SearchKindBlockProps) {
  const { value } = readSearchKindValue<"ai_answer">(serverData);
  const blocks = items(value.blocks);
  const [expanded, setExpanded] = useState(false);
  if (blocks.length === 0) return null;

  const refs: AnswerRef[] = items(value.references).flatMap((ref) => {
    const url = text(ref.url);
    if (!url) return [];
    let host = url;
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* keep the raw url */
    }
    return [{ url, label: text(ref.source_name) ?? host }];
  });
  const cited = citationIndexes(blocks);
  // Providers number from 0 or from 1; a [0] anywhere, or a top index that
  // still fits the list, means 0-based.
  const base =
    cited.length === 0 || cited.includes(0) || Math.max(...cited) < refs.length ? 0 : 1;

  const length = blocks.reduce(
    (sum, b) => sum + (text(b.text)?.length ?? 0) + strings(b.items).join("").length,
    0,
  );
  const collapsible = length > ANSWER_COLLAPSE_CHARS;
  const collapsed = collapsible && !expanded;
  const source = text(value.source);

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-primary/[0.03] p-4",
        className,
      )}
    >
      <div className="mb-2.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
        <AGENT_ICON className="h-4 w-4 text-primary" />
        <span>AI answer</span>
        {source && (
          <span className="font-normal text-muted-foreground">
            · {searchEngineLabel(source)}
          </span>
        )}
      </div>

      <div
        className={cn(
          "space-y-2.5 text-sm leading-relaxed text-foreground/90",
          collapsed &&
            "max-h-64 overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent)]",
        )}
      >
        {blocks.map((block, i) => {
          const type = text(block.type);
          if (type === "heading") {
            const heading = text(block.text);
            return heading ? (
              <div key={i} className="pt-0.5 font-semibold text-foreground">
                <AnswerInline value={heading} refs={refs} base={base} />
              </div>
            ) : null;
          }
          if (type === "list") {
            const listItems = strings(block.items);
            return listItems.length > 0 ? (
              <ul key={i} className="list-disc space-y-1 pl-5 marker:text-muted-foreground">
                {listItems.map((item, j) => {
                  // "Elevation: 8,849 m" reads as a fact row: the label leads.
                  const m = /^([^:\[\]*]{1,28}):\s+(.+)$/.exec(item);
                  return (
                    <li key={j}>
                      {m ? (
                        <>
                          <span className="font-medium text-foreground">{m[1]}:</span>{" "}
                          <AnswerInline value={m[2]} refs={refs} base={base} />
                        </>
                      ) : (
                        <AnswerInline value={item} refs={refs} base={base} />
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null;
          }
          const para = text(block.text);
          return para ? (
            <p key={i}>
              <AnswerInline value={para} refs={refs} base={base} />
            </p>
          ) : null;
        })}
      </div>

      {collapsible && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
      )}

      {refs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/70 pt-3">
          {refs.map((ref, i) => (
            <OutboundLink
              key={i}
              href={ref.url}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex max-w-[15rem] items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              title={ref.url}
            >
              <span className="tabular-nums text-muted-foreground">{i + 1}</span>
              <SearchFavicon url={ref.url} className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{ref.label}</span>
            </OutboundLink>
          ))}
        </div>
      )}
    </div>
  );
}
