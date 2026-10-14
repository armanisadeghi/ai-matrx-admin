"use client";

/**
 * Canonical components for the system-wide primitive kinds the search family
 * nests: `rating`, `opening_hours`, `postal_address`, `geo_coordinates`.
 * Each is dispatched standalone by the block registry AND composed by parent
 * kind components (local_place, entity_card, web_result).
 */

import React from "react";
import { ChevronDown, Clock, MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { items, num, readSearchKindValue, text } from "./search-kind-data";
import { RatingStars } from "./search-kind-shared";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

interface SearchKindBlockProps {
  serverData?: unknown;
  className?: string;
}

// ── rating ──────────────────────────────────────────────────────────────────

export function RatingBlock({ serverData, className }: SearchKindBlockProps) {
  const { value } = readSearchKindValue<"rating">(serverData);
  const rating = num(value.value);
  if (rating === null) return null;
  return (
    <RatingStars
      value={rating}
      bestPossible={num(value.best_possible)}
      count={num(value.count)}
      className={className}
    />
  );
}

// ── opening_hours ───────────────────────────────────────────────────────────

function dayLabel(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1, 3);
}

/** "17:00" → "5 PM", "08:30" → "8:30 AM"; anything else verbatim. */
export function clockLabel(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return hhmm;
  const h = Number(m[1]) % 24;
  const min = m[2];
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min === "00" ? `${h12} ${suffix}` : `${h12}:${min} ${suffix}`;
}

function minutesOf(hhmm: string | null): number | null {
  const m = hhmm ? /^(\d{1,2}):(\d{2})/.exec(hhmm.trim()) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * Google's hours line from today's window: "Open · Closes 5 PM" /
 * "Closed · Opens 8 AM". `now` is minutes since midnight in the place's own
 * clock (its timezone when known). Null when today's window is unreadable.
 */
export function openStatus(
  today: { opens?: string | null; closes?: string | null } | null,
  now: number,
): { open: boolean; line: string } | null {
  if (!today) return null;
  const opens = minutesOf(today.opens ?? null);
  const closes = minutesOf(today.closes ?? null);
  if (opens === null || closes === null) return null;
  // A window past midnight ("18:00–02:00") is open on either side of it.
  const open =
    closes > opens ? now >= opens && now < closes : now >= opens || now < closes;
  if (open) return { open, line: `Closes ${clockLabel(today.closes ?? "")}` };
  return {
    open,
    line: now < opens ? `Opens ${clockLabel(today.opens ?? "")}` : "Opens tomorrow",
  };
}

/** Minutes since midnight now, in `timeZone` when it is a real zone. */
export function minutesNow(timeZone?: string | null): number {
  const date = new Date();
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(date);
      const h = Number(parts.find((p) => p.type === "hour")?.value);
      const m = Number(parts.find((p) => p.type === "minute")?.value);
      if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
    } catch {
      /* not a zone name — fall back to the viewer's clock */
    }
  }
  return date.getHours() * 60 + date.getMinutes();
}

export function OpeningHoursBlock({
  serverData,
  className,
  timeZone,
  bare,
  summaryText,
}: SearchKindBlockProps & {
  /** The place's IANA zone, so "Open" is judged on its clock. */
  timeZone?: string | null;
  /** No leading clock icon (the host row already labels it "Hours"). */
  bare?: boolean;
  /** The provider's own status line ("Closed · Opens 8 AM Wed") when today's window is unknown. */
  summaryText?: string | null;
}) {
  const { value } = readSearchKindValue<"opening_hours">(serverData);
  const days = items(value.days);
  const today = value.today ?? null;
  const todayName = today ? text(today.day) : null;

  if (days.length === 0 && !today) return null;

  const status = openStatus(
    today ? { opens: text(today.opens), closes: text(today.closes) } : null,
    minutesNow(timeZone),
  );
  const summary = (
    <>
      {!bare && <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      {status ? (
        <span className="tabular-nums">
          <span className={cn("font-medium", status.open ? "text-success" : "text-destructive")}>
            {status.open ? "Open" : "Closed"}
          </span>
          {" · "}
          {status.line}
        </span>
      ) : summaryText ? (
        <span className="text-foreground">{summaryText}</span>
      ) : (
        <span className="text-foreground">Hours</span>
      )}
    </>
  );

  // The week is one click away; today is what people look for (Google's
  // local pack). A list without today's row opens straight to the week.
  if (days.length === 0) {
    return (
      <div className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
        {summary}
      </div>
    );
  }
  return (
    <details className={cn("group/hours text-sm text-muted-foreground", className)} open={!today && !summaryText}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 hover:text-foreground [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open/hours:rotate-180" />
      </summary>
      <div className={cn("mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs", !bare && "pl-5")}>
        {days.map((d, i) => {
          const name = text(d.day);
          const isToday = name !== null && name === todayName;
          return (
            <React.Fragment key={i}>
              <span className={cn(isToday && "font-medium text-foreground")}>
                {name ? dayLabel(name) : ""}
              </span>
              <span className={cn("tabular-nums", isToday && "font-medium text-foreground")}>
                {clockLabel(text(d.opens) ?? "")}–{clockLabel(text(d.closes) ?? "")}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </details>
  );
}

// ── postal_address ──────────────────────────────────────────────────────────

export function PostalAddressBlock({ serverData, className }: SearchKindBlockProps) {
  const { value } = readSearchKindValue<"postal_address">(serverData);
  const display = text(value.display);
  if (!display) return null;
  return (
    <span
      className={cn(
        "inline-flex items-start gap-1.5 text-sm text-muted-foreground",
        className,
      )}
    >
      <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
      <span>{display}</span>
    </span>
  );
}

// ── geo_coordinates — a coordinate pair is a door to a map (No Dead Ends). ──

export function GeoCoordinatesBlock({ serverData, className }: SearchKindBlockProps) {
  const { value } = readSearchKindValue<"geo_coordinates">(serverData);
  const lat = num(value.latitude);
  const lon = num(value.longitude);
  if (lat === null || lon === null) return null;
  return (
    <OutboundLink
      href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline",
        className,
      )}
      title="Open in map"
    >
      <Navigation className="h-3.5 w-3.5" />
      <span className="tabular-nums">
        {lat.toFixed(5)}, {lon.toFixed(5)}
      </span>
    </OutboundLink>
  );
}
