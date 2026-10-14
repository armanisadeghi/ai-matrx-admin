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
import { RatingStars, SearchChip, SearchFavicon } from "./search-kind-shared";
import {
  OpeningHoursBlock,
  PostalAddressBlock,
  RatingBlock,
} from "./primitive-blocks";
import { PropertyRow } from "@ai-matrx/design-system/controls";
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
          <OpeningHoursBlock serverData={value.hours} timeZone={text(value.timezone)} />
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

/** "phone_number" / "FOUNDED" / "place type" → "Phone number" / "Founded" / "Place type". */
function sentenceCase(label: string): string {
  const words = label.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!words) return words;
  // Keep acronyms ("CEO", "NASDAQ") as written; lower-case shouted words.
  const lowered = words === words.toUpperCase() && words.length > 4 ? words.toLowerCase() : words;
  return lowered.charAt(0).toUpperCase() + lowered.slice(1);
}

/** Labels and values that are machine identity, never shown to a person. */
const CODE_LABEL_RE = /(^|\s|_)(id|cid|kgmid|place id|coordinates?|latitude|longitude|lat|lng|lon)$/i;
function isCodeFact(label: string, value: string): boolean {
  if (CODE_LABEL_RE.test(label.trim())) return true;
  // A long unbroken token with digits ("ChIJN1t_tDeuEmsR…", "0x80dce…") is an id.
  return !/\s/.test(value) && value.length >= 16 && /\d/.test(value) && !/^https?:/i.test(value);
}

/** Same destination, ignoring scheme, "www." and a trailing slash. */
function sameUrl(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const norm = (u: string) =>
    u.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
  return norm(a) === norm(b);
}

/** One knowledge-panel action: Website / Directions / Call (Google's row). */
function PanelAction({
  href,
  icon: Icon,
  label,
  external = true,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  external?: boolean;
}) {
  const cls =
    "inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-sm text-primary transition-colors hover:bg-muted";
  return external ? (
    <OutboundLink href={href} onClick={(e) => e.stopPropagation()} className={cls}>
      <Icon className="h-4 w-4" />
      {label}
    </OutboundLink>
  ) : (
    <a href={href} onClick={(e) => e.stopPropagation()} className={cls}>
      <Icon className="h-4 w-4" />
      {label}
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// entity_card — the knowledge panel: who/what it is, how to reach it, the
// facts. Business details arrive as a nested `local_place` (`place`).
// ─────────────────────────────────────────────────────────────────────────────

export function EntityCardBlock({
  serverData,
  className,
}: SearchKindBlockProps) {
  const { value } = readSearchKindValue<"entity_card">(serverData);
  const name = text(value.name);
  if (!name) return null;

  // `place` is new on the server (2026-10-13) and not yet in the registry
  // row: read untyped until the re-seed + `pnpm shape:types` lands.
  const rawPlace = (value as Record<string, unknown>).place;
  const place = isRecord(rawPlace) ? rawPlace : null;
  const placeAddress = place && isRecord(place.address) ? text(place.address.display) : null;
  const phone = place ? text(place.phone) : null;
  const placeRating = place && isRecord(place.rating) ? place.rating : null;
  const ratingRecord = placeRating ?? (isRecord(value.rating) ? value.rating : null);
  const ratingValue = ratingRecord ? num(ratingRecord.value) : null;
  const ratingCount = ratingRecord ? num(ratingRecord.count) : null;
  const hours = place && isRecord(place.hours) ? place.hours : null;
  const hoursText = place ? text(place.hours_text) : null;
  const timeZone = place ? text(place.timezone) : null;
  const coordsRecord =
    place && isRecord(place.coordinates)
      ? place.coordinates
      : isRecord(value.coordinates)
        ? value.coordinates
        : null;
  const lat = coordsRecord ? num(coordsRecord.latitude) : null;
  const lon = coordsRecord ? num(coordsRecord.longitude) : null;

  const image = text(value.image) ?? (place ? text(place.thumbnail) : null);
  const website = text(value.website_url) ?? (place ? text(place.website_url) : null);
  const sourceUrl = text(value.source_url);
  const description = text(value.long_description) ?? text(value.description);
  const price = place ? text(place.price_text) : null;
  const placeCategory = place ? (strings(place.categories)[0] ?? null) : null;
  const rawCategory = text(value.category);
  // A bare type word ("place", "organization") says less than the business's
  // own category ("Employment agency").
  const category =
    placeCategory && (!rawCategory || /^(place|organization|business|thing)$/i.test(rawCategory))
      ? placeCategory
      : rawCategory;
  const categoryLine = [category ? sentenceCase(category) : null, price]
    .filter(Boolean)
    .join(" · ");

  const directionsTarget =
    placeAddress ?? (lat !== null && lon !== null ? `${lat},${lon}` : null);
  const directionsUrl = directionsTarget
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(directionsTarget)}`
    : null;

  const facts = items(value.facts).flatMap((fact) => {
    const label = factLine(fact.label);
    const factText = factLine(fact.text);
    if (!label || !factText || isCodeFact(label, factText)) return [];
    return [{ label: sentenceCase(label), text: factText, link: strings(fact.links)[0] ?? null }];
  });
  const profiles = items(value.profiles).flatMap((profile) => {
    const pName = text(profile.name);
    const pUrl = text(profile.url);
    // A profile that IS the website is already the Website button.
    if (!pName || !pUrl || sameUrl(pUrl, website)) return [];
    return [{ name: pName, url: pUrl, favicon: text(profile.favicon) }];
  });

  const hasDetails = Boolean(placeAddress || phone || hours || hoursText);
  const hasActions = Boolean(website || directionsUrl || phone);

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xl font-semibold leading-tight text-foreground">{name}</div>
          {categoryLine && (
            <div className="mt-1 text-sm text-muted-foreground">{categoryLine}</div>
          )}
          {ratingValue !== null && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-sm">
              <RatingStars
                value={ratingValue}
                bestPossible={ratingRecord ? num(ratingRecord.best_possible) : null}
                className="text-sm"
              />
              {ratingCount !== null && ratingCount > 0 && (
                <span className="text-muted-foreground">
                  {Intl.NumberFormat().format(ratingCount)}{" "}
                  {ratingCount === 1 ? "review" : "reviews"}
                </span>
              )}
            </div>
          )}
        </div>
        {image && (
          <ExtThumb
            src={image}
            className="h-[72px] w-[72px] flex-shrink-0 rounded-lg bg-muted object-cover"
          />
        )}
      </div>

      {hasActions && (
        <div className="mt-3 flex flex-wrap gap-2">
          {website && <PanelAction href={website} icon={Globe} label="Website" />}
          {directionsUrl && (
            <PanelAction href={directionsUrl} icon={Navigation} label="Directions" />
          )}
          {phone && (
            <PanelAction
              href={`tel:${phone.replace(/[^\d+]/g, "")}`}
              icon={Phone}
              label="Call"
              external={false}
            />
          )}
        </div>
      )}

      {description && (
        <p className="mt-3 line-clamp-6 text-sm leading-relaxed text-muted-foreground">
          {description}
          {sourceUrl && (
            <>
              {" "}
              <OutboundLink
                href={sourceUrl}
                onClick={(e) => e.stopPropagation()}
                className="text-foreground underline underline-offset-2 hover:text-primary"
              >
                Source
              </OutboundLink>
            </>
          )}
        </p>
      )}

      {(hasDetails || facts.length > 0) && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {placeAddress && <PropertyRow layout="inline" label="Address" value={placeAddress} />}
          {phone && (
            <PropertyRow layout="inline" label="Phone">
              <a
                href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                onClick={(e) => e.stopPropagation()}
                className="tabular-nums text-primary underline-offset-2 hover:underline"
              >
                {formatPhoneNumber(phone)}
              </a>
            </PropertyRow>
          )}
          {(hours || hoursText) && (
            <PropertyRow layout="inline" label="Hours">
              {hours ? (
                <OpeningHoursBlock serverData={hours} timeZone={timeZone} bare />
              ) : (
                hoursText
              )}
            </PropertyRow>
          )}
          {facts.slice(0, 8).map((fact, i) => (
            <PropertyRow key={i} layout="inline" label={fact.label}>
              {fact.link ? (
                <OutboundLink
                  href={fact.link}
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {fact.text}
                </OutboundLink>
              ) : (
                <span className="line-clamp-3">{fact.text}</span>
              )}
            </PropertyRow>
          ))}
        </div>
      )}

      {profiles.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="mb-2 text-sm font-medium text-foreground">Profiles</div>
          <div className="flex flex-wrap gap-1.5">
            {profiles.slice(0, 8).map((profile, i) => (
              <OutboundLink
                key={i}
                href={profile.url}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <SearchFavicon
                  iconUrl={profile.favicon}
                  url={profile.url}
                  className="h-4 w-4 flex-shrink-0"
                />
                {profile.name}
              </OutboundLink>
            ))}
          </div>
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
