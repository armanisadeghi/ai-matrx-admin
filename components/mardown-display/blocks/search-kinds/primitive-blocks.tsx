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

export function OpeningHoursBlock({ serverData, className }: SearchKindBlockProps) {
  const { value } = readSearchKindValue<"opening_hours">(serverData);
  const days = items(value.days);
  const today = value.today ?? null;
  const todayName = today ? text(today.day) : null;

  if (days.length === 0 && !today) return null;

  const todayLine = today ? `${text(today.opens) ?? ""}–${text(today.closes) ?? ""}` : null;
  const summary = (
    <>
      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {todayLine ? (
        <span className="tabular-nums">
          <span className="text-foreground">Today</span> {todayLine}
        </span>
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
    <details className={cn("group/hours text-sm text-muted-foreground", className)} open={!today}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 hover:text-foreground [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open/hours:rotate-180" />
      </summary>
      <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 pl-5 text-xs">
        {days.map((d, i) => {
          const name = text(d.day);
          const isToday = name !== null && name === todayName;
          return (
            <React.Fragment key={i}>
              <span className={cn(isToday && "font-medium text-foreground")}>
                {name ? dayLabel(name) : ""}
              </span>
              <span className={cn("tabular-nums", isToday && "font-medium text-foreground")}>
                {text(d.opens)}–{text(d.closes)}
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
