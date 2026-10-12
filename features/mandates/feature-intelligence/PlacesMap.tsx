"use client";

// THE MAP — every place in the feature where intelligence runs, as stops.
// Hovering a job lights up the stops it runs in; hovering a stop lights up its
// jobs (the host reads `onHoverPlace`). Real data only: a stop exists because a
// feature declared it (proved by its test) or a registered screen names it.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResolvedPlace } from "./types";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";

/** One tile: every place with the same label and destination, merged. */
export interface MergedPlace extends Omit<ResolvedPlace, "mandateKeys"> {
  ids: readonly string[];
  /** How many identical places were merged into this tile. */
  count: number;
  mandateKeys: readonly AnyMandateKey[];
}

/** Merge places that read and open the same thing into one tile with a count. */
export function mergePlaces(places: readonly ResolvedPlace[]): MergedPlace[] {
  const byKey = new Map<string, MergedPlace>();
  for (const place of places) {
    const key = `${place.label}\u0000${place.href ?? place.urlPattern ?? ""}`;
    const prior = byKey.get(key);
    if (!prior) {
      byKey.set(key, { ...place, ids: [place.id], count: 1 });
      continue;
    }
    byKey.set(key, {
      ...prior,
      ids: [...prior.ids, place.id],
      count: prior.count + 1,
      mandateKeys: [...new Set([...prior.mandateKeys, ...place.mandateKeys])],
    });
  }
  return [...byKey.values()];
}

export function PlacesMap({
  places,
  activeMandateKey,
  activePlaceId,
  onHoverPlace,
}: {
  places: readonly ResolvedPlace[];
  activeMandateKey: AnyMandateKey | null;
  activePlaceId: string | null;
  onHoverPlace: (placeId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const merged = useMemo(() => mergePlaces(places), [places]);
  if (merged.length === 0) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 rounded-md py-1 type-secondary font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronRight
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-90")}
          aria-hidden
        />
        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
        <span>Where it runs</span>
        <span className="tabular-nums">({merged.length})</span>
      </button>
      {open ? (
      <ol className="mt-1.5
grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-stretch"
        aria-label="Where intelligence runs"
      >
        {merged.map((place) => {
          const lit =
            (activeMandateKey !== null &&
              place.mandateKeys.includes(activeMandateKey)) ||
            (activePlaceId !== null && place.ids.includes(activePlaceId));
          const dim = activeMandateKey !== null && !lit;
          const inner = (
            <>
              <span className="flex items-center gap-1 type-secondary font-medium text-foreground">
                <MapPin
                  className={cn(
                    "h-3 w-3 shrink-0",
                    lit ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-hidden
                />
                <span className="truncate">{place.label}</span>
                <span
                  className="ml-auto pl-2 type-meta tabular-nums text-muted-foreground"
                  title={place.count > 1 ? `${place.count} places with this name and destination` : undefined}
                >
                  {place.count > 1 ? `\u00d7${place.count}` : place.mandateKeys.length}
                </span>
              </span>
              <span className="block truncate type-meta text-muted-foreground">
                {place.trigger}
              </span>
            </>
          );
          const className = cn(
            "block h-full w-full min-w-0 rounded-lg border px-2.5 py-1.5 text-left transition-all sm:w-[11.5rem]",
            lit
              ? "border-primary/60 bg-primary/10 shadow-sm"
              : "border-border bg-card hover:border-primary/40",
            dim && "opacity-45",
            !place.href && "border-dashed",
          );
          return (
            <li
              key={place.ids[0]}
              onMouseEnter={() => onHoverPlace(place.ids[0])}
              onMouseLeave={() => onHoverPlace(null)}
            >
              {place.href ? (
                <Link href={place.href} className={className}>
                  {inner}
                </Link>
              ) : (
                <span
                  className={className}
                  title={
                    place.urlPattern
                      ? "Open it from a specific record"
                      : undefined
                  }
                >
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      ) : null}
    </div>
  );
}
