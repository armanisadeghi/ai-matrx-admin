"use client";

/**
 * Honest progress while a comparison runs: one row per item, its stage in plain words, a bar that
 * fills as it goes, a check when it is done, one plain sentence when it failed. Works the same from
 * the live stream and from the durable run after a dropped connection or a refresh.
 */

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { ErrorNotice } from "@ai-matrx/design-system";

import { cn } from "@/lib/utils";

import type { ItemProgress, ItemStage } from "../contract";
import { isLink } from "../parse-input";
import { nameFromLink } from "../verdict";
import { ItemLogo } from "./ItemLogo";

export interface ProgressRowIdentity {
  name: string;
  logoUrl?: string | null;
  website?: string | null;
}

const WORDS: Record<string, Record<ItemStage, string>> = {
  companies_reviews: { queued: "Waiting", fetching: "Starting", waiting_for_provider: "Reading reviews", storing: "Saving the facts", done: "Done" },
  local_business: { queued: "Waiting", fetching: "Starting", waiting_for_provider: "Reading the listing", storing: "Saving the facts", done: "Done" },
};
const DEFAULT_WORDS: Record<ItemStage, string> = { queued: "Waiting", fetching: "Starting", waiting_for_provider: "Reading", storing: "Saving the facts", done: "Done" };
const SHARE: Record<ItemStage, number> = { queued: 0.04, fetching: 0.15, waiting_for_provider: 0.45, storing: 0.85, done: 1 };

function useElapsed(startedAt: number): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function RunProgress({ kind, kindLabel, items, identities, startedAt, recovering }: {
  kind: string;
  kindLabel: string;
  items: ItemProgress[];
  identities: ProgressRowIdentity[];
  startedAt: number;
  /** The connection dropped and the page is following the saved run. */
  recovering?: boolean;
}) {
  const elapsed = useElapsed(startedAt);
  const words = WORDS[kind] ?? DEFAULT_WORDS;
  const done = items.filter((i) => i.done).length;
  const count = Math.max(items.length, identities.length);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-live="polite">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <div>
          <div className="type-label mb-1">{kindLabel}</div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Getting the facts <span className="text-muted-foreground tabular-nums">{done} of {count}</span>
          </h2>
        </div>
        <div className="text-right">
          <div className="type-meta w-12 tabular-nums text-muted-foreground">{elapsed}</div>
          <div className="type-meta h-4 text-muted-foreground">{recovering ? "Reconnected" : ""}</div>
        </div>
      </div>
      <ul className="space-y-4">
        {Array.from({ length: count }, (_, i) => {
          const p = items[i];
          const id = identities[i] ?? (p ? { name: p.label, logoUrl: p.logoUrl, website: p.website } : undefined);
          const raw = id?.name || p?.label || `Item ${i + 1}`;
          const name = isLink(raw) ? nameFromLink(raw) : raw;
          const stage = p?.stage ?? "queued";
          const share = p?.error ? 1 : SHARE[p?.done ? "done" : stage];
          const working = !p?.done && !p?.error && stage !== "queued";
          return (
            <li key={i} className="grid grid-cols-[2rem_1fr] items-center gap-3">
              <ItemLogo name={name} logoUrl={id?.logoUrl} website={id?.website} size={32} fill={kind === "local_business"} />
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="type-title truncate text-foreground">{name}</span>
                  <span className={cn("type-secondary flex shrink-0 items-center gap-1",
                    p?.error ? "text-destructive" : "text-muted-foreground")}>
                    {p?.error ? <CircleAlert className="h-3.5 w-3.5" aria-hidden />
                      : p?.done ? <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden /> : null}
                    {p?.error ? "Not found" : words[p?.done ? "done" : stage]}
                  </span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out",
                    p?.error ? "bg-destructive" : p?.done ? "bg-success" : "bg-primary")}
                  style={{ width: `${Math.round(share * 100)}%` }} />
                  {working ? <div className="absolute inset-0 animate-pulse bg-primary/10" /> : null}
                </div>
                {p?.error ? <ErrorNotice size="inline" message={p.error} className="mt-1" /> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
